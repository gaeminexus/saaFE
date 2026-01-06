# Problema: Fechas LocalDateTime como Arrays desde Backend

## 📋 Descripción del Problema

El backend Java con Spring Boot/Jackson está enviando las fechas `LocalDateTime` como **arrays** en lugar de strings ISO, causando errores de formateo en el frontend.

### Formato Actual (Incorrecto)
```json
{
  "fechaCarga": [2025, 12, 11, 9, 23, 32, 2957000]
}
```

### Formato Esperado (Correcto)
```json
{
  "fechaCarga": "2025-12-11T09:23:32.002957"
}
```

## 🔍 Causa Raíz

Jackson (librería de serialización JSON en Java) serializa `LocalDateTime` como array cuando:
1. No tiene configurado `JavaTimeModule`
2. O tiene `SerializationFeature.WRITE_DATES_AS_TIMESTAMPS` habilitado

## ✅ Solución Frontend (Implementada)

Se agregó manejo de fechas en formato array en los métodos `convertirFecha()`:

```typescript
private convertirFecha(fecha: any): Date | null {
  if (!fecha) return null;

  if (fecha instanceof Date) return fecha;

  // Si es un array (como [2023,7,31,0,0]), convertir a Date
  if (Array.isArray(fecha)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
    // Los meses en JavaScript Date van de 0-11, pero el backend envía 1-12
    return new Date(year, month - 1, day, hour, minute, second, ms);
  }

  // ... otros formatos
}
```

**Archivos modificados:**
- `src/app/modules/crd/forms/entidad-participe/participe-dash/participe-dash.component.ts`
- `src/app/modules/crd/forms/archivos-petro/detalle-consulta-carga/detalle-consulta-carga.component.ts`

## 🛠️ Solución Backend (Recomendada)

### Opción 1: Configurar Jackson en application.properties/yml

```properties
# Serializar fechas como ISO-8601 strings
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.serialization.write-date-timestamps-as-nanoseconds=false
```

### Opción 2: Configurar ObjectMapper manualmente

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {
    
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
```

### Opción 3: Anotar las clases/campos específicos

```java
import com.fasterxml.jackson.annotation.JsonFormat;

public class CargaArchivo {
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime fechaCarga;
    
    // ... otros campos
}
```

## 📊 Impacto

**Sin la solución frontend:**
- ❌ Error: `InvalidPipeArgument: 'Unable to convert "2023,7,31,0,0" into a date'`
- ❌ Fechas mostradas como: `NaN-NaN-NaN / NaN:NaN`

**Con la solución frontend:**
- ✅ Fechas convertidas correctamente desde arrays
- ✅ Formato mostrado: `11-12-2025 / 09:23`

## 🎯 Recomendaciones

1. **Corto plazo:** ✅ La solución frontend ya está implementada y funciona
2. **Largo plazo:** 🔧 Configurar el backend para enviar fechas como strings ISO
3. **Coordinación:** 📢 Informar al equipo backend sobre este comportamiento

## 📝 Referencias

- [Jackson JavaTimeModule](https://github.com/FasterXML/jackson-modules-java8)
- [Spring Boot Jackson Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html#application-properties.json.spring.jackson)
- [LocalDateTime Serialization Best Practices](https://www.baeldung.com/jackson-serialize-dates)

---

**Última actualización:** Diciembre 2025  
**Estado:** Frontend parcheado ✅ | Backend pendiente de configuración 🔧
