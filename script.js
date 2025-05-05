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
  },
  // 其他图片数据...
];
