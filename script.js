// 模拟数据
const TAGS = [
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

const IMAGES = [
  {
    id: '1',
    url: 'https://source.unsplash.com/random/800x1000?landscape',
    thumbnail: 'https://source.unsplash.com/random/400x500?landscape',
    prompt: 'a beautiful mountain landscape with sunset, 8k, detailed, realistic',
    tags: ['1', '6', '9'],
    uploader: '用户A',
    uploadDate: '2023-05-15'
  },
  {
    id: '2',
    url: 'https://source.unsplash.com/random/600x800?portrait',
    thumbnail: 'https://source.unsplash.com/random/300x400?portrait',
    prompt: 'portrait of a young woman with blue eyes, soft lighting, studio photography',
    tags: ['2', '6'],
    uploader: '用户B',
    uploadDate: '2023-05-16'
  },
  {
    id: '3',
    url: 'https://source.unsplash.com/random/900x600?scifi',
    thumbnail: 'https://source.unsplash.com/random/450x300?scifi',
    prompt: 'futuristic city with flying cars and neon lights, cyberpunk style',
    tags: ['5', '4'],
    uploader: '用户C',
    uploadDate: '2023-05-17'
  },
  {
    id: '4',
    url: 'https://source.unsplash.com/random/700x900?animal',
    thumbnail: 'https://source.unsplash.com/random/350x450?animal',
    prompt: 'a majestic lion in the savanna, golden hour, detailed fur',
    tags: ['3', '6', '9'],
    uploader: '用户D',
    uploadDate: '2023-05-18'
  },
  {
    id: '5',
    url: 'https://source.unsplash.com/random/800x800?illustration',
    thumbnail: 'https://source.unsplash.com/random/400x400?illustration',
    prompt: 'colorful abstract illustration, geometric shapes, vibrant colors',
    tags: ['7', '9'],
    uploader: '用户E',
    uploadDate: '2023-05-19'
  },
];

// 工具函数
function getTagById(id) {
  return TAGS.find(tag => tag.id === id);
}

function getImageById(id) {
  return IMAGES.find(image => image.id === id);
}

function getTagsForImage(image) {
  return image.tags.map(tagId => getTagById(tagId));
}

// DOM 元素
const tagButtons = document.querySelectorAll('.tag-filter .tag');
const imageCards = document.querySelectorAll('.image-card');
const detailModal = document.querySelector('.detail-modal');
const uploadButton = document.querySelector('.upload-button');
const uploadPanel = document.querySelector('.upload-panel');
const closeUploadPanelButton = document.querySelector('.close-upload-panel');
const closeDetailButton = document.querySelector('.close-detail');
const copyPromptButton = document.getElementById('copy-prompt');
const uploadForm = document.getElementById('upload-form');
const fileUploadInput = document.getElementById('file-upload');
const uploadDropzone = document.querySelector('.upload-dropzone');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageButton = document.getElementById('remove-image');
const tagSelector = document.getElementById('tag-selector');
const submitButton = document.getElementById('submit-button');

// 初始化标签选择器
function initTagSelector() {
  tagSelector.innerHTML = '';
  TAGS.forEach(tag => {
    const tagButton = document.createElement('button');
    tagButton.type = 'button';
    tagButton.className = 'tag bg-gray-100 text-gray-800';
    tagButton.dataset.id = tag.id;
    tagButton.innerHTML = `<i class="ri-price-tag-3-line mr-1" style="font-size: 12px;"></i>${tag.name}`;
    tagButton.addEventListener('click', () => {
      tagButton.classList.toggle('bg-blue-500');
      tagButton.classList.toggle('text-white');
      tagButton.classList.toggle('bg-gray-100');
      tagButton.classList.toggle('text-gray-800');
    });
    tagSelector.appendChild(tagButton);
  });
}

// 标签筛选功能
let selectedTagIds = [];

tagButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tagId = button.dataset.id;
    
    // 切换标签选中状态
    button.classList.toggle('bg-blue-500');
    button.classList.toggle('text-white');
    button.classList.toggle('bg-gray-100');
    button.classList.toggle('text-gray-800');
    
    // 更新选中的标签ID列表
    if (selectedTagIds.includes(tagId)) {
      selectedTagIds = selectedTagIds.filter(id => id !== tagId);
    } else {
      selectedTagIds.push(tagId);
    }
    
    // 筛选图片
    filterImages();
  });
});

function filterImages() {
  imageCards.forEach(card => {
    const imageId = card.dataset.id;
    const image = getImageById(imageId);
    
    if (selectedTagIds.length === 0 || selectedTagIds.some(tagId => image.tags.includes(tagId))) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// 图片卡片交互
imageCards.forEach(card => {
  // 鼠标悬停显示复制按钮
  const copyBtn = card.querySelector('.copy-btn');
  
  card.addEventListener('mouseenter', () => {
    copyBtn.classList.remove('hidden');
  });
  
  card.addEventListener('mouseleave', () => {
    copyBtn.classList.add('hidden');
  });
  
  // 点击卡片显示详情
  card.addEventListener('click', () => {
    const imageId = card.dataset.id;
    showImageDetail(imageId);
  });
  
  // 复制提示词
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const imageId = card.dataset.id;
    const image = getImageById(imageId);
    copyToClipboard(image.prompt);
    
    // 显示复制成功状态
    const originalIcon = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="ri-check-line"></i>';
    copyBtn.classList.remove('bg-blue-500');
    copyBtn.classList.add('bg-green-500');
    
    setTimeout(() => {
      copyBtn.innerHTML = originalIcon;
      copyBtn.classList.remove('bg-green-500');
      copyBtn.classList.add('bg-blue-500');
    }, 2000);
  });
});

// 显示图片详情
function showImageDetail(imageId) {
  const image = getImageById(imageId);
  if (!image) return;
  
  // 设置详情内容
  document.getElementById('detail-image').src = image.url;
  document.getElementById('detail-image').alt = image.prompt.substring(0, 30);
  document.getElementById('detail-prompt').textContent = image.prompt;
  document.getElementById('detail-uploader').textContent = `上传者: ${image.uploader}`;
  document.getElementById('detail-date').textContent = `上传日期: ${image.uploadDate}`;
  
  // 设置标签
  const tagsContainer = document.getElementById('detail-tags');
  tagsContainer.innerHTML = '';
  
  getTagsForImage(image).forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'tag bg-gray-100 text-gray-800';
    tagSpan.textContent = tag.name;
    tagsContainer.appendChild(tagSpan);
  });
  
  // 显示弹层
  detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 关闭图片详情
closeDetailButton.addEventListener('click', () => {
  detailModal.classList.add('hidden');
  document.body.style.overflow = '';
});

// 点击背景关闭详情
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) {
    detailModal.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// 复制提示词
copyPromptButton.addEventListener('click', () => {
  const prompt = document.getElementById('detail-prompt').textContent;
  copyToClipboard(prompt);
  
  // 显示复制成功状态
  const originalIcon = copyPromptButton.innerHTML;
  copyPromptButton.innerHTML = '<i class="ri-check-line"></i>';
  copyPromptButton.classList.remove('bg-blue-500');
  copyPromptButton.classList.add('bg-green-500');
  
  setTimeout(() => {
    copyPromptButton.innerHTML = originalIcon;
    copyPromptButton.classList.remove('bg-green-500');
    copyPromptButton.classList.add('bg-blue-500');
  }, 2000);
});

// 复制到剪贴板
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// 上传面板交互
uploadButton.addEventListener('click', () => {
  uploadPanel.classList.add('open');
});

closeUploadPanelButton.addEventListener('click', () => {
  uploadPanel.classList.remove('open');
});

// 文件上传交互
uploadDropzone.addEventListener('click', () => {
  fileUploadInput.click();
});

fileUploadInput.addEventListener('change', (e) => {
  handleFileSelect(e.target.files);
});

uploadDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadDropzone.classList.add('active');
});

uploadDropzone.addEventListener('dragleave', () => {
  uploadDropzone.classList.remove('active');
});

uploadDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadDropzone.classList.remove('active');
  handleFileSelect(e.dataTransfer.files);
});

function handleFileSelect(files) {
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      document.getElementById('dropzone-placeholder').style.display = 'none';
      imagePreviewContainer.classList.remove('hidden');
    };
    
    reader.readAsDataURL(file);
  }
}

removeImageButton.addEventListener('click', (e) => {
  e.stopPropagation();
  imagePreviewContainer.classList.add('hidden');
  document.getElementById('dropzone-placeholder').style.display = 'block';
  fileUploadInput.value = '';
});

// 表单提交
uploadForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // 获取表单数据
  const prompt = document.getElementById('prompt').value;
  const uploader = document.getElementById('uploader').value;
  const selectedTags = Array.from(tagSelector.querySelectorAll('.bg-blue-500')).map(btn => btn.dataset.id);
  
  // 验证表单
  if (!imagePreview.src || !prompt || !uploader || selectedTags.length === 0) {
    alert('请填写所有必填字段');
    return;
  }
  
  // 模拟上传过程
  submitButton.textContent = '上传中...';
  submitButton.disabled = true;
  
  setTimeout(() => {
    submitButton.textContent = '上传成功！';
    submitButton.classList.remove('bg-blue-500');
    submitButton.classList.add('bg-green-500');
    
    // 重置表单
    setTimeout(() => {
      uploadForm.reset();
      imagePreviewContainer.classList.add('hidden');
      document.getElementById('dropzone-placeholder').style.display = 'block';
      submitButton.textContent = '提交';
      submitButton.disabled = false;
      submitButton.classList.remove('bg-green-500');
      submitButton.classList.add('bg-blue-500');
      uploadPanel.classList.remove('open');
      
      // 重置标签选择
      tagSelector.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('bg-blue-500', 'text-white');
        tag.classList.add('bg-gray-100', 'text-gray-800');
      });
    }, 2000);
  }, 1500);
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initTagSelector();
});