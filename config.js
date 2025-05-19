require('dotenv').config();

module.exports = {
    COZE_API_KEY: process.env.COZE_API_KEY || 'pat_CMLtOVIKxXR5ZZnXtF62W5WIS22e4eKKI7vD8i1j8f5Uey4rHU4yohWROp1vf6yw',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    COZE_WORKFLOW_ID: process.env.COZE_WORKFLOW_ID || '7502726512597123072',
    COZE_SPACE_ID: process.env.COZE_SPACE_ID || '7460521430900490277',
    COZE_BOT_ID: process.env.COZE_BOT_ID || '7348293334459312345',
    DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key'
}; 