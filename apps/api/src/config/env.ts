import dotenv from 'dotenv';

dotenv.config();

// Validar que JWT_SECRET esté definido
if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET no está definido en .env');
    process.exit(1);
}

export const env = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: process.env.JWT_SECRET,
    PORT: parseInt(process.env.PORT || '3001', 10),
};
