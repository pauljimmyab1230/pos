# POS System - Sistema de Punto de Venta

Sistema completo de punto de venta para negocios en Perú, con facturación electrónica, gestión de productos, clientes y reportes.

## 🚀 Características

- **Punto de Venta (POS)** - Interfaz rápida para ventas
- **Facturación Electrónica** - Boletas, Facturas, Notas de Venta
- **Gestión de Productos** - CRUD completo con categorías SUNAT
- **Gestión de Clientes** - DNI, RUC, Carnet de Extranjería
- **Cotizaciones** - Crear y convertir a documentos de venta
- **Historial** - Ver todos los documentos generados
- **Reportes** - Ventas, productos, clientes
- **Configuración** - Perfil, cuentas bancarias, impresión

## 📁 Estructura del Proyecto

```
pos-system/
├── apps/
│   ├── api/                    # Backend (Express + Prisma + MySQL)
│   │   ├── prisma/             # Schema de base de datos
│   │   └── src/                # Código fuente del API
│   └── web/                    # Frontend (React + Vite + Tailwind)
│       ├── public/             # Archivos estáticos (templates PDF)
│       └── src/                # Código fuente del frontend
├── package.json                # Configuración del monorepo
└── turbo.json                  # Configuración de Turborepo
```

## 🛠️ Tecnologías

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Base de datos**: MySQL
- **Autenticación**: JWT

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Estilos**: Tailwind CSS
- **Estado**: Zustand
- **Routing**: React Router

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- MySQL 8+
- npm o yarn

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/pauljimmyab1230/pos.git
cd pos
```

2. **Instalar dependencias**
```bash
npm install
cd apps/api && npm install
cd ../web && npm install
```

3. **Configurar base de datos**
```bash
# Crear base de datos en MySQL
mysql -u root -p -e "CREATE DATABASE pos_system"

# Editar archivo apps/api/.env con tus credenciales
```

4. **Configurar variables de entorno**
```bash
# apps/api/.env
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/pos_system"
JWT_SECRET="tu-secreto-seguro"
PORT=3001
```

5. **Ejecutar migraciones**
```bash
cd apps/api
npx prisma db push
```

6. **Iniciar el sistema**
```bash
# Desde la raíz del proyecto
npm run dev
```

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

## 📋 Módulos

### 1. Autenticación
- Registro de negocios
- Login de usuarios
- Roles: Admin, Vendedor

### 2. Productos
- CRUD completo
- Categorías SUNAT
- Unidades de medida
- Código de barras
- Control de stock

### 3. Clientes
- DNI, RUC, Carnet de Extranjería
- Datos de contacto
- Búsqueda por documento

### 4. Punto de Venta (POS)
- Selección rápida de productos
- Carrito de compras
- Generación de Nota de Venta

### 5. Documentos Electrónicos
- **Nota de Venta** - Generada desde POS
- **Boleta** - Convertida desde Nota de Venta
- **Factura** - Convertida desde Nota de Venta
- **Cotización** - Propuestas a clientes

### 6. Historial
- Lista de todos los documentos
- Filtros por tipo
- Conversión de documentos
- Detalles completos

### 7. Configuración
- Perfil del negocio
- Cuentas bancarias
- Configuración de impresión
- Gestión de usuarios

## 📊 Base de datos

### Tablas principales
- `Business` - Datos del negocio
- `User` - Usuarios del sistema
- `Product` - Productos y servicios
- `Client` - Clientes
- `Sale` - Ventas (Boletas, Facturas, Notas)
- `Quote` - Cotizaciones
- `Series` - Series y correlativos
- `BankAccount` - Cuentas bancarias

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Validación de businessId en todos los endpoints
- Transacciones de base de datos para atomicidad

## 📝 Licencia

MIT License
