// 这是一个示例文件，展示了Duduu项目的核心组件实现
// 实际开发时，应将这些组件拆分到对应的目录中

import React, { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import { useDropzone } from 'react-dropzone';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { FiPlus, FiX, FiCopy, FiUpload, FiTag, FiUser, FiCheck } from 'react-icons/fi';

// 类型定义
type Image = {
  id: string;
  url: string;
  thumbnail: string;
  prompt: string;
  tags: Tag[];
  uploader: string;
  uploadDate: string;
};

type Tag = {
  id: string;
  name: string;
  category?: string;
};

// 模拟数据
const MOCK_TAGS: Tag[] = [
  { id: '1', name: '风景', category: '场景' },
  { id: '2', name: '人物', category: '主体' },
  { id: '3', name: '动物', category: '主体' },
  { id: '4', name: '建筑', category: '场景' },
  { id: '5', name: '科幻', category: '风格' },
  { id: '6', name: '写实', category: '风格' },
  { id: '7', name: '插画', category: '风格' },
  { id: '8', name: '黑白', category: '色彩' },
  { id: '9', name: '彩色', category: '色彩' },
];

const MOCK_IMAGES: Image[] = [
  {
    id: '1',
    url: 'https://source.unsplash.com/random/800x1000?landscape',
    thumbnail: 'https://source.unsplash.com/random/400x500?landscape',
    prompt: 'a beautiful mountain landscape with sunset, 8k, detailed, realistic',
    tags: [MOCK_TAGS[0], MOCK_TAGS[5], MOCK_TAGS[8]],
    uploader: '用户A',
    uploadDate: '2023-05-15'
  },
  {
    id: '2',
    url: 'https://source.unsplash.com/random/600x800?portrait',
    thumbnail: 'https://source.unsplash.com/random/300x400?portrait',
    prompt: 'portrait of a young woman with blue eyes, soft lighting, studio photography',
    tags: [MOCK_TAGS[1], MOCK_TAGS[5]],
    uploader: '用户B',
    uploadDate: '2023-05-16'
  },
  {
    id: '3',
    url: 'https://source.unsplash.com/random/900x600?scifi',
    thumbnail: 'https://source.unsplash.com/random/450x300?scifi',
    prompt: 'futuristic city with flying cars and neon lights, cyberpunk style',
    tags: [MOCK_TAGS[4], MOCK_TAGS[3]],
    uploader: '用户C',
    uploadDate: '2023-05-17'
  },
  {
    id: '4',
    url: 'https://source.unsplash.com/random/700x900?animal',
    thumbnail: 'https://source.unsplash.com/random/350x450?animal',
    prompt: 'a majestic lion in the savanna, golden hour, detailed fur',
    tags: [MOCK_TAGS[2], MOCK_TAGS[5], MOCK_TAGS[8]],
    uploader: '用户D',
    uploadDate: '2023-05-18'
  },
  {
    id: '5',
    url: 'https://source.unsplash.com/random/800x800?illustration',
    thumbnail: 'https://source.unsplash.com/random/400x400?illustration',
    prompt: 'colorful abstract illustration, geometric shapes, vibrant colors',
    tags: [MOCK_TAGS[6], MOCK_TAGS[8]],
    uploader: '用户E',
    uploadDate: '2023-05-19'
  },
];

// 标签筛选组件
const TagFilter: React.FC = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<{[key: string]: Tag[]}>({});

  useEffect(() => {
    // 按类别分组标签
    const groupedTags = MOCK_TAGS.reduce((acc, tag) => {
      const category = tag.category || '其他';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tag);
      return acc;
    }, {} as {[key: string]: Tag[]});
    
    setCategories(groupedTags);
  }, []);

  const handleTagClick = (tagId: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-3">标签筛选</h3>
      
      {Object.entries(categories).map(([category, tags]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">{category}</h4>
          <div className="flex flex-wrap">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={`tag ${selectedTags.includes(tag.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                aria-label={`标签: ${tag.name}`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// 图片卡片组件
const ImageCard: React.FC<{ image: Image; onClick: () => void }> = ({ image, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="image-card shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`图片: ${image.prompt.substring(0, 30)}...`}
    >
      <img 
        src={image.thumbnail} 
        alt={image.prompt.substring(0, 30)} 
        className="w-full h-auto rounded-t-lg"
        loading="lazy"
      />
      
      <div className="p-3 bg-white rounded-b-lg">
        <div className="flex flex-wrap mb-2">
          {image.tags.slice(0, 3).map(tag => (
            <span key={tag.id} className="tag bg-gray-100 text-gray-800 text-xs">
              {tag.name}
            </span>
          ))}
        </div>
        
        {isHovered && (
          <CopyToClipboard text={image.prompt} onCopy={handleCopy}>
            <button 
              className={`absolute bottom-3 right-3 p-2 rounded-full ${copied ? 'bg-green-500' : 'bg-blue-500'} text-white shadow-lg`}
              onClick={handleCopy}
              aria-label="复制提示词"
            >
              {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            </button>
          </CopyToClipboard>
        )}
      </div>
    </div>
  );
};

// 图片详情弹层
const ImageDetail: React.FC<{ image: Image | null; onClose: () => void }> = ({ image, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!image) return null;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="detail-modal bg-black bg-opacity-75"
      onClick={handleBackdropClick}
    >
      <div className="detail-content shadow-xl max-w-4xl w-full">
        <div className="relative">
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-white text-gray-800 shadow-lg z-10"
            onClick={onClose}
            aria-label="关闭"
          >
            <FiX size={20} />
          </button>
          
          <img 
            src={image.url} 
            alt={image.prompt} 
            className="detail-image w-full"
          />
        </div>
        
        <div className="detail-info bg-white">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">提示词</h3>
            <div className="p-3 bg-gray-50 rounded-lg text-gray-800 relative">
              <p className="pr-10">{image.prompt}</p>
              <CopyToClipboard text={image.prompt} onCopy={handleCopy}>
                <button 
                  className={`absolute top-3 right-3 p-2 rounded-full ${copied ? 'bg-green-500' : 'bg-blue-500'} text-white`}
                  aria-label="复制提示词"
                >
                  {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </CopyToClipboard>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">标签</h3>
            <div className="flex flex-wrap">
              {image.tags.map(tag => (
                <span key={tag.id} className="tag bg-gray-100 text-gray-800">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex items-center text-gray-600">
            <FiUser className="mr-2" />
            <span>上传者: {image.uploader}</span>
            <span className="mx-2">•</span>
            <span>上传日期: {image.uploadDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 上传按钮和面板
const UploadPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [uploader, setUploader] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setUploadedImage(file);
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  });

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage || !prompt || !uploader || selectedTags.length === 0) {
      alert('请填写所有必填字段');
      return;
    }

    setIsSubmitting(true);
    
    // 模拟上传过程
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // 重置表单
      setTimeout(() => {
        setUploadedImage(null);
        setImagePreview('');
        setPrompt('');
        setUploader('');
        setSelectedTags([]);
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 2000);
    }, 1500);
  };

  return (
    <>
      <button 
        className="upload-button p-4 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        onClick={() => setIsOpen(true)}
        aria-label="上传图片"
      >
        <FiPlus size={24} />
      </button>

      <div className={`upload-panel p-6 ${isOpen ? 'open' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">上传图片</h2>
          <button 
            className="p-2 text-gray-500 hover:text-gray-700"
            onClick={() => setIsOpen(false)}
            aria-label="关闭上传面板"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">上传图片</label>
            <div 
              {...getRootProps()} 
              className={`upload-dropzone ${isDragActive ? 'active' : ''} ${imagePreview ? 'p-2' : ''}`}
            >
              <input {...getInputProps()} />
              
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="预览" 
                    className="w-full h-auto rounded"
                  />
                  <button 
                    type="button"
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedImage(null);
                      setImagePreview('');
                    }}
                    aria-label="移除图片"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <FiUpload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600">拖放图片到此处，或点击上传</p>
                  <p className="text-gray-400 text-sm mt-1">支持 JPG, PNG, WEBP 格式</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="prompt" className="block text-gray-700 font-medium mb-2">提示词</label>
            <textarea
              id="prompt"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入生成此图片的提示词..."
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">选择标签</label>
            <div className="flex flex-wrap p-3 border border-gray-300 rounded-lg min-h-[100px]">
              {MOCK_TAGS.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`tag ${selectedTags.includes(tag.id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  <FiTag className="mr-1" size={12} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="uploader" className="block text-gray-700 font-medium mb-2">上传者</label>
            <input
              id="uploader"
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              placeholder="输入您的名称"
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg font-medium ${isSubmitting || submitSuccess ? 'bg-green-500' : 'bg-blue-500'} text-white hover:bg-opacity-90 transition-colors`}
            disabled={isSubmitting || submitSuccess}
          >
            {isSubmitting ? '上传中...' : submitSuccess ? '上传成功！' : '提交'}
          </button>
        </form>
      </div>
    </>
  );
};

// 主页面组件
const GalleryPage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [filteredImages, setFilteredImages] = useState<Image[]>(MOCK_IMAGES);

  // 瀑布流断点配置
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-10">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Duduu 镜头页面</h1>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        <TagFilter />
        
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
        >
          {filteredImages.map(image => (
            <ImageCard 
              key={image.id} 
              image={image} 
              onClick={() => setSelectedImage(image)} 
            />
          ))}
        </Masonry>
      </main>

      {selectedImage && (
        <ImageDetail 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}

      <UploadPanel />
    </div>
  );
};

export default GalleryPage;