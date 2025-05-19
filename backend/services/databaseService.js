const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// 数据库连接实例
let db;

/**
 * 初始化数据库连接
 * @returns {Promise<object>} 数据库连接实例
 */
async function initDatabase() {
    if (db) return db;
    
    try {
        db = await open({
            filename: path.join(__dirname, '..', 'database.sqlite'),
            driver: sqlite3.Database
        });
        
        // 创建图片表
        await db.exec(`
            CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
                image_url TEXT NOT NULL,
                title TEXT,
                description TEXT,
                creator TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 创建标签表
        await db.exec(`
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                category TEXT,
                count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 创建图片-标签关联表
        await db.exec(`
            CREATE TABLE IF NOT EXISTS image_tags (
                image_id INTEGER,
                tag_id INTEGER,
                PRIMARY KEY (image_id, tag_id),
                FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
            )
        `);
        
        console.log('数据库初始化成功');
        return db;
    } catch (error) {
        console.error('数据库初始化失败:', error);
        throw new Error(`数据库初始化失败: ${error.message}`);
    }
}

/**
 * 保存图片数据
 * @param {Object} imageData - 图片数据对象
 * @returns {Promise<Object>} - 保存后的图片数据（包含ID）
 */
async function saveImageData(imageData) {
    try {
        const database = await initDatabase();
        
        // 插入图片数据
        const result = await database.run(
            `INSERT INTO images (prompt, image_url, title, description, creator, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                imageData.prompt, 
                imageData.imageUrl,
                imageData.title || imageData.prompt.substring(0, 50), // 如果没有标题，使用提示词的前50个字符
                imageData.description || '',
                imageData.creator || 'system',
                imageData.status || 'pending'
            ]
        );
        
        const imageId = result.lastID;
        
        // 保存标签
        if (imageData.tags && Array.isArray(imageData.tags) && imageData.tags.length > 0) {
            await saveTags(imageId, imageData.tags);
        }
        
        // 获取保存的图片数据（包含ID）
        const savedImage = await getImageById(imageId);
        return savedImage;
    } catch (error) {
        console.error('保存图片数据失败:', error);
        throw new Error(`保存图片数据失败: ${error.message}`);
    }
}

/**
 * 保存标签并关联到图片
 * @param {number} imageId - 图片ID
 * @param {Array<string>} tags - 标签数组
 * @returns {Promise<void>}
 */
async function saveTags(imageId, tags) {
    const database = await initDatabase();
    
    for (const tagName of tags) {
        // 标签名规范化：去除特殊字符，转为小写
        const normalizedTagName = tagName.trim().toLowerCase();
        if (!normalizedTagName) continue;
        
        try {
            // 检查标签是否已存在
            let tagId;
            const existingTag = await database.get('SELECT id FROM tags WHERE name = ?', normalizedTagName);
            
            if (existingTag) {
                tagId = existingTag.id;
                // 更新标签计数
                await database.run('UPDATE tags SET count = count + 1 WHERE id = ?', tagId);
            } else {
                // 创建新标签
                const result = await database.run(
                    'INSERT INTO tags (name, category) VALUES (?, ?)',
                    [normalizedTagName, guessTagCategory(normalizedTagName)]
                );
                tagId = result.lastID;
            }
            
            // 创建图片-标签关联
            await database.run(
                'INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)',
                [imageId, tagId]
            );
        } catch (err) {
            console.error(`保存标签 "${tagName}" 失败:`, err);
            // 继续处理其他标签
        }
    }
}

/**
 * 猜测标签类别
 * @param {string} tagName - 标签名
 * @returns {string} - 猜测的类别
 */
function guessTagCategory(tagName) {
    // 这里实现一个简单的标签分类逻辑，可以根据需要扩展
    const styleKeywords = ['风格', '画风', 'style', 'art'];
    const subjectKeywords = ['人物', '角色', 'character', 'person', 'people'];
    const elementKeywords = ['元素', '场景', 'scene', 'element'];
    
    if (styleKeywords.some(keyword => tagName.includes(keyword))) {
        return 'style';
    } else if (subjectKeywords.some(keyword => tagName.includes(keyword))) {
        return 'subject';
    } else if (elementKeywords.some(keyword => tagName.includes(keyword))) {
        return 'element';
    }
    
    return 'other';
                }

/**
 * 根据ID获取图片数据
 * @param {number} id - 图片ID
 * @returns {Promise<Object>} - 图片数据
 */
async function getImageById(id) {
    try {
        const database = await initDatabase();
        
        // 获取图片基本信息
        const image = await database.get('SELECT * FROM images WHERE id = ?', id);
        if (!image) {
            throw new Error(`未找到ID为 ${id} 的图片`);
        }
        
        // 获取图片关联的标签
        const tags = await database.all(`
            SELECT t.name
            FROM tags t
            JOIN image_tags it ON t.id = it.tag_id
            WHERE it.image_id = ?
        `, id);
        
        // 添加标签到图片对象
        image.tags = tags.map(tag => tag.name);
        
        return image;
    } catch (error) {
        console.error('获取图片数据失败:', error);
        throw new Error(`获取图片数据失败: ${error.message}`);
    }
}

/**
 * 更新图片数据
 * @param {number} id - 图片ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object>} - 更新后的图片数据
 */
async function updateImageData(id, updateData) {
    try {
        const database = await initDatabase();
        
        // 构建更新SQL
        const fields = [];
        const values = [];
        
        if (updateData.prompt !== undefined) {
            fields.push('prompt = ?');
            values.push(updateData.prompt);
        }
        
        if (updateData.title !== undefined) {
            fields.push('title = ?');
            values.push(updateData.title);
        }
        
        if (updateData.description !== undefined) {
            fields.push('description = ?');
            values.push(updateData.description);
        }
        
        if (updateData.status !== undefined) {
            fields.push('status = ?');
            values.push(updateData.status);
        }
        
        // 添加更新时间
        fields.push('updated_at = CURRENT_TIMESTAMP');
        
        // 如果没有要更新的字段，直接返回
        if (fields.length === 0) {
            return await getImageById(id);
        }
        
        // 执行更新
        values.push(id);
        await database.run(
            `UPDATE images SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        // 更新标签
        if (updateData.tags && Array.isArray(updateData.tags)) {
            // 删除旧的图片-标签关联
            await database.run('DELETE FROM image_tags WHERE image_id = ?', id);
            
            // 保存新标签
            await saveTags(id, updateData.tags);
        }
        
        // 返回更新后的图片数据
        return await getImageById(id);
    } catch (error) {
        console.error('更新图片数据失败:', error);
        throw new Error(`更新图片数据失败: ${error.message}`);
    }
}

/**
 * 获取图片列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {string} status - 状态过滤
 * @param {Array<string>} tags - 标签过滤
 * @returns {Promise<Object>} - 分页结果对象
 */
async function getImageList(page = 1, pageSize = 20, status = null, tags = []) {
    try {
        const database = await initDatabase();
        
        // 构建查询条件
        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('i.status = ?');
            params.push(status);
        }

        let sql = `
            SELECT i.* 
            FROM images i
        `;
        
        // 如果有标签过滤，添加JOIN和条件
        if (tags && tags.length > 0) {
            sql += `
                JOIN image_tags it ON i.id = it.image_id
                JOIN tags t ON it.tag_id = t.id
                WHERE t.name IN (${tags.map(() => '?').join(',')})
            `;
            params.push(...tags);
            
            if (conditions.length > 0) {
                sql += ` AND ${conditions.join(' AND ')}`;
            }
            
            sql += `
                GROUP BY i.id
                HAVING COUNT(DISTINCT t.name) = ?
            `;
            params.push(tags.length);
        } else if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // 添加排序和分页
        sql += `
            ORDER BY i.created_at DESC
            LIMIT ? OFFSET ?
        `;
        params.push(pageSize, (page - 1) * pageSize);
        
        // 执行查询
        const images = await database.all(sql, params);
        
        // 获取每个图片的标签
        for (const image of images) {
            const tags = await database.all(`
                SELECT t.name
                FROM tags t
                JOIN image_tags it ON t.id = it.tag_id
                WHERE it.image_id = ?
            `, image.id);
            
            image.tags = tags.map(tag => tag.name);
            }

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM images i';
        if (conditions.length > 0) {
            countSql += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        const countResult = await database.get(countSql, params.slice(0, params.length - 2));
        const total = countResult ? countResult.total : 0;
        
        return {
            data: images,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error('获取图片列表失败:', error);
        throw new Error(`获取图片列表失败: ${error.message}`);
    }
}

/**
 * 获取热门标签
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} - 标签数组
 */
async function getHotTags(limit = 20) {
    try {
        const database = await initDatabase();
        
        const tags = await database.all(`
            SELECT name, count, category
            FROM tags
            ORDER BY count DESC
            LIMIT ?
        `, limit);
        
        return tags;
    } catch (error) {
        console.error('获取热门标签失败:', error);
        throw new Error(`获取热门标签失败: ${error.message}`);
    }
}

/**
 * 搜索标签
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} - 标签数组
 */
async function searchTags(keyword, limit = 20) {
    try {
        const database = await initDatabase();
        
        const tags = await database.all(`
            SELECT name, count, category
            FROM tags
            WHERE name LIKE ?
            ORDER BY count DESC
            LIMIT ?
        `, [`%${keyword}%`, limit]);
        
        return tags;
    } catch (error) {
        console.error('搜索标签失败:', error);
        throw new Error(`搜索标签失败: ${error.message}`);
    }
}

module.exports = {
    initDatabase,
    saveImageData,
    getImageById,
    updateImageData,
    getImageList,
    getHotTags,
    searchTags
}; 