# Backend API

Backend desarrollado con NestJS y TypeScript.

## Requirements

Antes de comenzar, asegúrate de tener instalado:

* Node.js
* npm
* Una cuenta de Supabase
* Una cuenta de Cloudinary

## Project setup

Clona el repositorio e instala las dependencias:

```bash
git clone <repository-url>
cd <project-folder>
npm install
```

## Environment variables

El proyecto utiliza variables de entorno para configurar servicios externos y proteger información sensible.

### 1. Create the environment file

Copia el archivo `.env.example`:

```bash
cp .env.example .env
```

### 2. Configure the variables

Completa el archivo `.env` con tus propias credenciales:

```env
# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### JWT

`JWT_SECRET` se utiliza para firmar los tokens de autenticación.

Puedes generar un secreto aleatorio con:

```bash
openssl rand -base64 32
```

Por ejemplo:

```env
JWT_SECRET=tu_secreto_generado
JWT_EXPIRES_IN=7d
```

No utilices el `JWT_SECRET` de otra instalación del proyecto.

### Supabase

Necesitas crear un proyecto en Supabase y obtener las credenciales correspondientes.

* `SUPABASE_URL`: URL de tu proyecto.
* `SUPABASE_ANON_KEY`: clave pública del proyecto.
* `SUPABASE_SERVICE_ROLE_KEY`: clave con privilegios administrativos. **Nunca debe exponerse públicamente.**

Si el proyecto incluye migraciones o seeders, ejecútalos según las instrucciones correspondientes.

### Cloudinary

Crea una cuenta de Cloudinary y configura:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`CLOUDINARY_API_SECRET` es una credencial privada y no debe subirse al repositorio.

> **Important:** Never commit your `.env` file or expose your secrets publicly.

## Compile and run

### Development

```bash
npm run start
```

### Watch mode

```bash
npm run start:dev
```

### Production

```bash
npm run start:prod
```

## Seeders

Para ejecutar los seeders:

```bash
npm run seed
```

Asegúrate de configurar correctamente las variables de entorno antes de ejecutar este comando.

## Tests

### Unit tests

```bash
npm run test
```

### End-to-end tests

```bash
npm run test:e2e
```

### Test coverage

```bash
npm run test:cov
```

## Project structure

La estructura principal del proyecto sigue la arquitectura de NestJS:

```text
src/
├── modules/
├── common/
├── config/
├── ...
```

La estructura exacta puede variar según los módulos implementados en el proyecto.

## Security

Nunca subas credenciales reales al repositorio.

El archivo `.env` debe estar incluido en `.gitignore`:

```gitignore
.env
.env.local
.env.production
```

El repositorio debe contener únicamente `.env.example`, que sirve como plantilla para configurar una nueva instalación.

## Deployment

Para desplegar la aplicación en producción, configura las mismas variables de entorno utilizadas localmente en el proveedor de hosting.

**No subas el archivo `.env` al servidor mediante Git.** Configura las variables de entorno directamente en la plataforma de deployment.

Para más información sobre deployment en NestJS, consulta la documentación oficial de NestJS.

## Resources

* NestJS Documentation
* NestJS Deployment Documentation

## License

This project is licensed under the MIT License.
