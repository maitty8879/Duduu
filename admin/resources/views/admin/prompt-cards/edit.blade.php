@extends('layouts.app')

@section('content')
<div class="container">
    <h2>编辑图片卡片</h2>
    <form action="{{ route('prompt-cards.update', $promptCard) }}" method="POST">
        @csrf @method('PUT')
        <div class="mb-3">
            <label>提示词</label>
            <input type="text" name="prompt" class="form-control" value="{{ $promptCard->prompt }}" required>
        </div>
        <div class="mb-3">
            <label>分类</label>
            <input type="text" name="category" class="form-control" value="{{ $promptCard->category }}">
        </div>
        <div class="mb-3">
            <label>标签（逗号分隔）</label>
            <input type="text" name="tags" class="form-control" value="{{ implode(',', json_decode($promptCard->tags, true) ?? []) }}">
        </div>
        <button type="submit" class="btn btn-success">保存</button>
        <a href="{{ route('prompt-cards.index') }}" class="btn btn-secondary">返回</a>
    </form>
</div>
@endsection
