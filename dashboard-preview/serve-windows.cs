// Compiled in memory by the Windows PowerShell launcher. No installation or
// execution-policy changes. Serves only local static files, never proxies APIs.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace SiteVisionPreview
{
    public sealed class Server : IDisposable
    {
        private readonly string root;
        private readonly int port;
        private readonly TcpListener listener;
        private volatile bool running;

        private Server(string directory, int number)
        {
            root = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
            port = number;
            listener = new TcpListener(IPAddress.Loopback, port);
            listener.ExclusiveAddressUse = true;
        }

        public string Url
        {
            get { return "http://localhost:" + port + "/dashboard-preview/review.html"; }
        }

        public bool IsRunning { get { return running; } }

        public static Server Start(string directory, int port)
        {
            Server server = new Server(directory, port);
            foreach (string name in new[] { "index.html", "clima/index.html",
                "dashboard-preview/review.html", "dashboard-preview/site-vision-dashboard.html" })
            {
                if (!File.Exists(Path.Combine(server.root, name)))
                    throw new IOException("Falta " + name + ". Descomprimi todo el ZIP.");
            }
            try { server.listener.Start(); }
            catch (SocketException exception)
            {
                throw new IOException("No se puede usar localhost:" + port
                    + ". Cerra otra preview abierta y volve a intentar.", exception);
            }
            server.running = true;
            Thread accept = new Thread(server.Accept);
            accept.IsBackground = true;
            accept.Start();
            return server;
        }

        private void Accept()
        {
            try
            {
                while (running)
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(delegate(object state) { Serve((TcpClient)state); }, client);
                }
            }
            catch (SocketException) { }
            catch (ObjectDisposedException) { }
            finally { running = false; }
        }

        private void Serve(TcpClient client)
        {
            using (client)
            {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 15000;
                try
                {
                    using (NetworkStream stream = client.GetStream())
                    {
                        // One bounded request per connection; no writes or directory listings.
                        List<byte> bytes = new List<byte>();
                        bool complete = false;
                        while (bytes.Count < 16384)
                        {
                            int value = stream.ReadByte();
                            if (value < 0) return;
                            bytes.Add((byte)value);
                            int count = bytes.Count;
                            if (count >= 4 && bytes[count - 4] == 13 && bytes[count - 3] == 10
                                && bytes[count - 2] == 13 && bytes[count - 1] == 10)
                            { complete = true; break; }
                        }
                        if (!complete) { Empty(stream, "431 Request Header Fields Too Large"); return; }
                        string[] lines = Encoding.ASCII.GetString(bytes.ToArray()).Split(new[] { "\r\n" }, StringSplitOptions.None);
                        string[] request = lines[0].Split(' ');
                        if (request.Length != 3 || !request[2].StartsWith("HTTP/1.", StringComparison.Ordinal))
                        { Empty(stream, "400 Bad Request"); return; }
                        string host = null;
                        foreach (string line in lines)
                        {
                            if (!line.StartsWith("Host:", StringComparison.OrdinalIgnoreCase)) continue;
                            if (host != null) { Empty(stream, "400 Bad Request"); return; }
                            host = line.Substring(5).Trim();
                        }
                        if (!string.Equals(host, "localhost:" + port, StringComparison.OrdinalIgnoreCase))
                        { Empty(stream, "403 Forbidden"); return; }
                        if (request[0] != "GET" && request[0] != "HEAD")
                        { Empty(stream, "405 Method Not Allowed"); return; }
                        string target = request[1].Split('?')[0];
                        if (!target.StartsWith("/", StringComparison.Ordinal))
                        { Empty(stream, "400 Bad Request"); return; }
                        target = Uri.UnescapeDataString(target);
                        string[] parts = target.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
                        string path = root;
                        foreach (string part in parts)
                        {
                            if (part.StartsWith(".", StringComparison.Ordinal)
                                || part.IndexOfAny(":\\*?\"<>|\0".ToCharArray()) >= 0
                                || part.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
                            { Empty(stream, "404 Not Found"); return; }
                            path = Path.Combine(path, part);
                            if ((File.Exists(path) || Directory.Exists(path))
                                && (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
                            { Empty(stream, "404 Not Found"); return; }
                        }
                        if (Directory.Exists(path)) path = Path.Combine(path, "index.html");
                        path = Path.GetFullPath(path);
                        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(path)
                            || (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
                        { Empty(stream, "404 Not Found"); return; }
                        using (FileStream file = File.OpenRead(path))
                        {
                            Headers(stream, "200 OK", Mime(path), file.Length);
                            if (request[0] == "GET") file.CopyTo(stream);
                        }
                    }
                }
                catch (IOException) { }
                catch (SocketException) { }
                catch (UnauthorizedAccessException) { }
                catch (ArgumentException) { }
                catch (UriFormatException) { }
            }
        }

        private static string Mime(string path)
        {
            switch (Path.GetExtension(path).ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": case ".mjs": return "text/javascript; charset=utf-8";
                case ".json": case ".geojson": return "application/json; charset=utf-8";
                case ".webmanifest": return "application/manifest+json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".webp": return "image/webp";
                case ".gif": return "image/gif";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".ttf": return "font/ttf";
                case ".woff": return "font/woff";
                case ".woff2": return "font/woff2";
                case ".txt": case ".md": return "text/plain; charset=utf-8";
                default: return "application/octet-stream";
            }
        }

        private static void Empty(Stream stream, string status)
        { Headers(stream, status, "text/plain; charset=utf-8", 0); }

        private static void Headers(Stream stream, string status, string mime, long length)
        {
            byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + "\r\nContent-Type: " + mime
                + "\r\nContent-Length: " + length.ToString(CultureInfo.InvariantCulture)
                + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff"
                + "\r\nAllow: GET, HEAD\r\nConnection: close\r\n\r\n");
            stream.Write(header, 0, header.Length);
        }

        public void Dispose()
        {
            running = false;
            listener.Stop();
        }
    }
}
