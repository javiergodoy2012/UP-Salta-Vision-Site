# Auditoría kilométrica UP Salta

**Fecha:** 24/09/2026  
**Proyecto:** UP Salta Visión / Localizador ferroviario  
**Repositorio:** `javiergodoy2012/UP-Salta-Vision-Site`

## 1. Alcance

Esta primera auditoría comprende los ramales **C, C14, C15, C16 y C18**.

- **C13:** fuera de esta etapa; su auditoría quedó pausada para continuarla en forma específica.
- **C25:** fuera de alcance.
- La auditoría fue exclusivamente de diagnóstico.
- No se modificaron `NETWORK`, PK, geometrías, datasets operativos ni lógica de producción.
- No se realizó deploy.

## 2. Criterio de trabajo

El objetivo fue identificar diferencias entre la progresiva kilométrica utilizada por Site Visión y la distancia física representada por la geometría ferroviaria.

Se aplicaron, según el ramal:

- comparación entre ΔPK y distancia física sobre la geometría;
- revisión de discontinuidades y cambios abruptos;
- comparación entre geometría original y geometría corregida;
- proyección de controles físicos sobre la vía;
- contraste con cruces habilitados del dataset operativo;
- intersecciones geométricas entre rutas/calles y la vía;
- contraste cartográfico con OpenStreetMap como control externo.

### Principio de autoridad de datos

Los datos internos y oficiales utilizados por Site Visión continúan siendo la referencia operativa del sistema.

OpenStreetMap y demás fuentes cartográficas externas fueron utilizados únicamente como **controles geométricos independientes**. No deben reemplazar automáticamente la información operativa ni justificar por sí solos una modificación de PK.

---

## 3. Resumen ejecutivo

| Ramal | Resultado principal | Clasificación |
|---|---|---|
| **C** | Discontinuidad puntual muy marcada en PK 1120.800 → 1120.810 | Requiere validación independiente |
| **C14** | Múltiples irregularidades locales de parametrización; sin evidencia de error global uniforme | Requiere auditoría focalizada |
| **C15** | Geometría continua; posible offset sectorial moderado | Observación, sin corrección |
| **C16** | Geometría continua; dos controles con diferencias moderadas | Observación, evidencia limitada |
| **C18** | Geometría regular; diferencias pequeñas y distribuidas | Sin anomalías críticas |

---

## 4. Ramal C

### Resultado global

- ΔPK aproximado auditado: **173,000 km**
- Longitud geométrica: **173,579 km**
- Diferencia acumulada: **+579,450 m**
- Diferencia relativa: **+0,3349 %**

### Anomalía principal

Sector:

`PK 1120.800 → PK 1120.810`

- ΔPK nominal: **10,000 m**
- distancia geométrica Site: **256,434 m**
- exceso físico respecto del ΔPK: **+246,434 m**

La anomalía ya estaba presente en la geometría original:

- geometría original: **256,393 m**
- geometría corregida: **256,434 m**
- efecto de la corrección: aproximadamente **+0,040 m**

Por lo tanto, la corrección cartográfica aplicada posteriormente **no generó la discontinuidad**.

### Verificación ferroviaria externa

Los dos ways OSM principales involucrados:

- `319493564`
- `124221961`

figuran como vía principal del FC Belgrano, referencia `C-III`, y comparten un nodo ferroviario.

La distancia medida sobre la vía OSM principal entre los puntos correspondientes a PK 1120.800 y 1120.810 fue aproximadamente:

**256,078 m**

Esto confirma que la geometría física representada en ese sector es coherente con el corredor ferroviario; la irregularidad se encuentra en la relación **PK ↔ distancia física**.

### Relación con el inicio del C15

Inicio nominal C15:

`PK 1120.846`

El inicio físico del C15 proyectado sobre el Ramal C cae aproximadamente en:

`PK_C 1120.808307`

Diferencia respecto de la progresiva nominal:

**−37,693 m**

El empalme C/C15 se encuentra físicamente dentro del sector de discontinuidad, pero la evidencia disponible no permite afirmar que sea la causa del salto.

### Conclusión C

Existe una **discontinuidad paramétrica puntual fuerte**. No debe corregirse hasta contar con una referencia kilométrica ferroviaria independiente y suficientemente confiable.

---

## 5. Ramal C14

### Resultado global inicial

- ΔPK aproximado: **553,917 km**
- longitud geométrica: **558,179 km**
- diferencia acumulada: **+4.261,564 m**
- diferencia relativa: **+0,7694 %**
- segmentos >25 m: **76**
- segmentos >50 m: **3**

Los reportes de corrección indican:

- discontinuidades existentes: **76**
- discontinuidades nuevas introducidas por la corrección: **0**

Por lo tanto, las irregularidades principales ya estaban presentes en la parametrización/geometría base.

### Sectores relevantes

#### Chorrillos · entorno PK 1199

Se identificaron dos inversiones de dirección cercanas a 180°, compatibles con el trazado ferroviario real tipo zig-zag.

Conclusión: la geometría es físicamente plausible; el PK no es proporcional a la distancia recorrida durante la maniobra ferroviaria.

#### El Muñal · entorno PK 1297.500

El corredor contiene puente/viaducto y túnel ferroviario sobre la vía principal.

La reconstrucción de geometría original y corregida demostró que la anomalía principal ya existía antes de la corrección cartográfica.

Conclusión: irregularidad heredada de parametrización; no corresponde realizar una corrección automática.

#### Socompa · extremo del ramal

El extremo se mantiene dentro del corredor ferroviario correcto, pero aparece una diferencia longitudinal importante respecto de las referencias utilizadas.

La discrepancia es principalmente **longitudinal/paramétrica**, no una desviación lateral masiva de la traza.

Requiere una referencia física/documental ferroviaria independiente antes de cualquier ajuste.

### Controles RP27

Intersecciones físicas actuales RP27 ↔ C14:

| PK oficial | PK físico equivalente | Error |
|---:|---:|---:|
| 1419.630 | 1419.784359 | +154,4 m |
| 1424.128 | 1424.914247 | +786,2 m |
| 1439.120 | 1439.001944 | −118,1 m |
| 1446.145 | 1446.105355 | −39,6 m |

El registro oficial:

`PK 1443.030 · RP27`

no presenta una contraparte cartográfica actual RP27 dentro del corredor auditado.

El caso `PK 1424.128` permanece como discrepancia significativa y requiere validación independiente.

### Conclusión C14

No existe evidencia de un offset global uniforme que pueda corregirse en bloque.

El C14 debe tratarse por **sectores específicos**, priorizando la validación documental/física de los puntos anómalos antes de modificar producción.

---

## 6. Ramal C15

### Resultado geométrico inicial

- ΔPK aproximado: **334,516 km**
- longitud geométrica: **335,596 km**
- diferencia acumulada: **+1.079,537 m**
- diferencia relativa: **+0,3227 %**
- discontinuidades >25 m: **0**

La geometría es continua.

### Controles exactos relevantes

| Control | Error aproximado |
|---|---:|
| RN56 / RP56 · PK 1138.706 | entre −16,0 m y +9,5 m según cruce asociado |
| RN34 · PK 1170.330 | +118,5 m |
| RN34 · PK 1195.402 | +67,8 m |
| RN81 · PK 1340.630 | +93,1 m |
| RN34 · PK 1343.623 | +100,6 m |

Los cuatro controles RN34/RN81 forman un grupo cercano a **+95 m**, pero el control inicial del ramal se encuentra prácticamente en cero.

Los registros RP57 y RP51 no pudieron validarse contra una ruta OSM inequívocamente coincidente. Los caminos encontrados en sus inmediaciones tenían otras denominaciones.

### Conclusión C15

Existe una posible diferencia sectorial del orden de decenas de metros, pero **no está demostrada como offset global del ramal**.

No corresponde recalibrar C15 con la evidencia actual.

---

## 7. Ramal C16

### Resultado geométrico inicial

- ΔPK aproximado: **25,700 km**
- longitud geométrica: **25,564 km**
- diferencia acumulada: **−135,803 m**
- diferencia relativa: **−0,5284 %**
- discontinuidades >25 m: **0**

### Controles

#### RN34 · PK 1291.730

Intersección física:

`PK_eq 1291.612692`

Error:

**−117,3 m**

#### Registro RP50 · PK 1300.800

OSM identifica el camino como:

`RN50 · Ruta Nacional 50`

Intersección:

`PK_eq 1300.742276`

Error:

**−57,7 m**

Existe una inconsistencia de nomenclatura RP50/RN50 que debe verificarse contra la fuente oficial.

### Conclusión C16

No se detectan discontinuidades geométricas severas. Los dos controles disponibles muestran diferencias moderadas, pero son insuficientes para justificar una recalibración.

---

## 8. Ramal C18

### Resultado global

- PK inicial: **1186.000**
- PK final: **1299.100**
- ΔPK: **113,100 km**
- longitud geométrica: **113,469 km**
- diferencia acumulada: **+368,609 m**
- diferencia relativa: **+0,3259 %**

### Regularidad

- segmentos analizados: **11.310**
- segmentos >25 m: **0**
- segmentos >50 m: **0**
- residual mediano por segmento: **+0,067 m**
- residual medio por segmento: **+0,033 m**
- |residual| P95: **0,257 m**
- |residual| P99: **0,543 m**
- |residual| máximo: **0,674 m**

### Sector con mayor compresión

Entre aproximadamente PK 1222 y 1229 existe una diferencia distribuida, con máxima intensidad en:

- 1226–1227: **−60,3 m/km**
- 1227–1228: **−53,7 m/km**
- 1228–1229: **−41,9 m/km**

La variación es gradual y se compensa parcialmente con otros sectores del ramal.

### Conclusión C18

No existen anomalías críticas de continuidad.

Las diferencias observadas son pequeñas y distribuidas. No se recomienda modificar la geometría ni la parametrización sin controles físicos independientes.

---

## 9. Criterio de intervención

A la fecha de esta auditoría **no se recomienda modificar producción**.

Una corrección de PK o geometría debería realizarse únicamente cuando exista una referencia independiente de suficiente calidad, por ejemplo:

- progresiva ferroviaria oficial verificable;
- plano ferroviario o documento técnico oficial;
- obra de arte con PK inequívoco;
- estación o punto kilométrico documentado;
- paso a nivel cuya identidad física y progresiva puedan confirmarse de manera independiente.

La proximidad a OSM, por sí sola, no constituye evidencia suficiente para modificar la kilometración operativa.

---

## 10. Prioridades para futuras etapas

### Prioridad alta

**Ramal C · PK 1120.800–1120.810**

Determinar documentalmente la causa de la discontinuidad de aproximadamente 246 m respecto del ΔPK.

**Ramal C14**

Continuar auditorías focalizadas en los sectores ya identificados, especialmente aquellos con discrepancias documentales o longitudinales significativas.

### Prioridad media

**C15 y C16**

Incorporar nuevos controles físicos/documentales independientes antes de evaluar cualquier ajuste sectorial.

### Prioridad baja

**C18**

No requiere intervención inmediata. Mantener como referencia de control y revisar solo ante aparición de nuevas fuentes.

---

## 11. Estado de producción

Como resultado de esta auditoría:

- no se modificó `NETWORK`;
- no se modificaron progresivas PK;
- no se modificaron archivos de geometría;
- no se modificó `cruces-habilitados-data.js`;
- no se realizó commit de corrección;
- no se realizó deploy;
- la producción permanece sin cambios funcionales.

Este documento registra únicamente el diagnóstico técnico obtenido durante la auditoría.
