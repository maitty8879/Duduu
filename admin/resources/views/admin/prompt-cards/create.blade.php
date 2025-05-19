@extends('layouts.app')

@section('content')
<div class="container">
    <h2>新建图片卡片</h2>
    
    @if(session('error'))
        <div class="alert alert-danger">{{ session('error') }}</div>
    @endif
    
    <form action="{{ route('prompt-cards.store') }}" method="POST" id="cardForm">
        @csrf
        <div class="mb-3">
            <label for="prompt">提示词</label>
            <textarea name="prompt" id="prompt" class="form-control" rows="3" required>{{ old('prompt') }}</textarea>
        </div>
        
        <div class="mb-3">
            <label for="category">分类</label>
            <input type="text" name="category" id="category" class="form-control" value="{{ old('category') }}">
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <button type="button" id="generateBtn" class="btn btn-secondary">生成预览图片</button>
            </div>
            <div class="col-md-6 text-end">
                <button type="submit" class="btn btn-primary">保存卡片</button>
                <a href="{{ route('prompt-cards.index') }}" class="btn btn-secondary">返回</a>
            </div>
        </div>
        
        <input type="hidden" id="imageUrl" name="image_url">
        <input type="hidden" id="tagsJson" name="tags">
    </form>
    
    <div class="row mt-4" id="previewContainer" style="display: none;">
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">生成的图片预览</div>
                <div class="card-body text-center">
                    <div id="loadingIndicator" style="display: none;">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p>正在生成图片，请稍候...</p>
                    </div>
                    <img id="previewImage" class="img-fluid" style="max-height: 300px; display: none;">
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">生成的标签</div>
                <div class="card-body">
                    <div id="tagContainer"></div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
    // 调试信息
    console.log('脚本已加载');
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('页面已完全加载');
        
        const generateBtn = document.getElementById('generateBtn');
        const promptInput = document.getElementById('prompt');
        const previewContainer = document.getElementById('previewContainer');
        const previewImage = document.getElementById('previewImage');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const tagContainer = document.getElementById('tagContainer');
        const imageUrlInput = document.getElementById('imageUrl');
        const tagsJsonInput = document.getElementById('tagsJson');
        
        console.log('生成按钮元素:', generateBtn);
        
        // 添加生成图片按钮点击事件
        generateBtn.addEventListener('click', function(e) {
            console.log('生成按钮被点击');
            e.preventDefault(); // 防止表单提交
            
            const prompt = promptInput.value.trim();
            console.log('提示词:', prompt);
            
            if (!prompt) {
                alert('请输入提示词');
                return;
            }
            
            // 显示加载指示器
            loadingIndicator.style.display = 'block';
            previewImage.style.display = 'none';
            previewContainer.style.display = 'block';
            tagContainer.innerHTML = '';
            
            // 准备CSRF令牌
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
            console.log('CSRF令牌:', csrfToken);
            
            // 使用XMLHttpRequest替代fetch
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '{{ route("api.generate-image") }}', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.onload = function() {
                console.log('API响应状态:', xhr.status);
                console.log('API响应内容:', xhr.responseText);
                
                loadingIndicator.style.display = 'none';
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        
                        if (data.success && data.imageUrl) {
                            // 显示生成的图片
                            previewImage.src = data.imageUrl;
                            previewImage.style.display = 'block';
                            imageUrlInput.value = data.imageUrl;
                            
                            // 显示生成的标签
                            if (data.tags && Array.isArray(data.tags)) {
                                const tagsHtml = data.tags.map(tag => 
                                    `<span class="badge bg-secondary me-1">${tag}</span>`
                                ).join('');
                                tagContainer.innerHTML = tagsHtml;
                                
                                // 将标签添加到表单中
                                tagsJsonInput.value = JSON.stringify(data.tags);
                            }
                        } else {
                            alert('生成图片失败: ' + (data.error || '未知错误'));
                        }
                    } catch (parseError) {
                        console.error('JSON解析错误:', parseError);
                        alert('API响应格式错误');
                    }
                } else {
                    alert('API请求失败: ' + xhr.status);
                }
            };
            
            xhr.onerror = function() {
                console.error('API请求出错');
                loadingIndicator.style.display = 'none';
                alert('API请求出错，请检查网络连接');
            };
            
            // 发送请求
            const requestData = JSON.stringify({ prompt: prompt });
            console.log('发送请求数据:', requestData);
            xhr.send(requestData);
        });
    });
</script>
@endsection
