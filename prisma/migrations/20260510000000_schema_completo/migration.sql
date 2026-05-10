-- Migracion completa schema Palex Medical
-- Generada para despliegue en Railway

-- Enums
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'VENTAS', 'PROYECTOS');
CREATE TYPE "TipoHospital" AS ENUM ('HOSPITAL_PUBLICO', 'HOSPITAL_PRIVADO', 'CLINICA_PRIVADA', 'LABORATORIO', 'CENTRO_SALUD', 'UNIVERSIDAD', 'OTRO');
CREATE TYPE "TipoVisita" AS ENUM ('PROYECTOS', 'VENTAS');
CREATE TYPE "EstadoVisita" AS ENUM ('BORRADOR', 'COMPLETADA', 'ARCHIVADA');
CREATE TYPE "EtapaPipeline" AS ENUM ('IDENTIFICADO', 'PRIMERA_VISITA', 'PROPUESTA', 'NEGOCIACION', 'GANADO', 'PERDIDO');

-- Tabla: usuarios
CREATE TABLE "usuarios" (
    "id"        TEXT NOT NULL,
    "nombre"    TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "rol"       "Rol" NOT NULL DEFAULT 'VENTAS',
    "activo"    BOOLEAN NOT NULL DEFAULT true,
    "creadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- Tabla: zonas
CREATE TABLE "zonas" (
    "id"          TEXT NOT NULL,
    "nombre"      TEXT NOT NULL,
    "descripcion" TEXT,
    "activo"      BOOLEAN NOT NULL DEFAULT true,
    "creadoEn"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "zonas_nombre_key" ON "zonas"("nombre");

-- Tabla pivot: usuarios_zonas
CREATE TABLE "usuarios_zonas" (
    "usuarioId" TEXT NOT NULL,
    "zonaId"    TEXT NOT NULL,
    CONSTRAINT "usuarios_zonas_pkey" PRIMARY KEY ("usuarioId", "zonaId")
);

-- Tabla: hospitales
CREATE TABLE "hospitales" (
    "id"        TEXT NOT NULL,
    "nombre"    TEXT NOT NULL,
    "ciudad"    TEXT NOT NULL,
    "provincia" TEXT,
    "pais"      TEXT NOT NULL DEFAULT 'España',
    "tipo"      "TipoHospital" NOT NULL DEFAULT 'HOSPITAL_PUBLICO',
    "camas"     INTEGER,
    "direccion" TEXT,
    "activo"    BOOLEAN NOT NULL DEFAULT true,
    "zonaId"    TEXT NOT NULL,
    "creadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hospitales_pkey" PRIMARY KEY ("id")
);

-- Tabla: contactos
CREATE TABLE "contactos" (
    "id"         TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nombre"     TEXT NOT NULL,
    "cargo"      TEXT,
    "email"      TEXT,
    "telefono"   TEXT,
    "principal"  BOOLEAN NOT NULL DEFAULT false,
    "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- Tabla: visitas
CREATE TABLE "visitas" (
    "id"         TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "usuarioId"  TEXT NOT NULL,
    "tipo"       "TipoVisita" NOT NULL,
    "estado"     "EstadoVisita" NOT NULL DEFAULT 'BORRADOR',
    "fecha"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datos"      JSONB NOT NULL DEFAULT '{}',
    "fotos"      JSONB NOT NULL DEFAULT '[]',
    "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEn"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- Tabla: oportunidades
CREATE TABLE "oportunidades" (
    "id"            TEXT NOT NULL,
    "hospitalId"    TEXT NOT NULL,
    "usuarioId"     TEXT NOT NULL,
    "titulo"        TEXT NOT NULL,
    "etapa"         "EtapaPipeline" NOT NULL DEFAULT 'IDENTIFICADO',
    "valorEstimado" DOUBLE PRECISION,
    "probabilidad"  INTEGER,
    "fechaCierre"   TIMESTAMP(3),
    "productos"     JSONB NOT NULL DEFAULT '[]',
    "notas"         TEXT,
    "motivoPerdida" TEXT,
    "creadoEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEn"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "oportunidades_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "usuarios_zonas"
    ADD CONSTRAINT "usuarios_zonas_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usuarios_zonas"
    ADD CONSTRAINT "usuarios_zonas_zonaId_fkey"
    FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hospitales"
    ADD CONSTRAINT "hospitales_zonaId_fkey"
    FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON UPDATE CASCADE;

ALTER TABLE "contactos"
    ADD CONSTRAINT "contactos_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visitas"
    ADD CONSTRAINT "visitas_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitales"("id") ON UPDATE CASCADE;

ALTER TABLE "visitas"
    ADD CONSTRAINT "visitas_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON UPDATE CASCADE;

ALTER TABLE "oportunidades"
    ADD CONSTRAINT "oportunidades_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "hospitales"("id") ON UPDATE CASCADE;

ALTER TABLE "oportunidades"
    ADD CONSTRAINT "oportunidades_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON UPDATE CASCADE;
