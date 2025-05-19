require('dotenv').config();

module.exports = {
    COZE_API_KEY: process.env.COZE_API_KEY || 'pat_YvaGtW9pBxkkoTcfgalBA9qyvOEbGNNhCVW4wi2oMuUuPK6GFRZdm4CXG97yWyNA',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    COZE_WORKFLOW_ID: process.env.COZE_WORKFLOW_ID || '7504135123563233292',
    COZE_APPLICATION_ID: process.env.COZE_APPLICATION_ID || '7504135123563233292',
    COZE_PROJECT_ID: process.env.COZE_PROJECT_ID || '7504135123563233292',
    COZE_SPACE_ID: process.env.COZE_SPACE_ID || '7460521430900490277',
    COZE_BOT_ID: process.env.COZE_BOT_ID || '7498010266886471718',
    DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    DEBUG: process.env.DEBUG === 'true' || true,
    ALLOW_MOCK_SERVICE: process.env.ALLOW_MOCK_SERVICE === 'true' || true
}; 