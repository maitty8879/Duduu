@extends('layouts.app')

@section('content')
<div class="container">
    <h2>图片卡片管理</h2>
    <a href="{{ route('prompt-cards.create') }}" class="btn btn-primary mb-3">新建卡片</a>
    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>图片</th>
                <th>提示词</th>
                <th>标签</th>
                <th>分类</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
        @foreach($cards as $card)
            <tr>
                <td>
                    @if($card->image_url)
                        <img src="{{ $card->image_url }}" style="max-width:80px;">
                    @endif
                </td>
                <td>{{ $card->prompt }}</td>
                <td>
                    @foreach(json_decode($card->tags, true) ?? [] as $tag)
                        <span class="badge bg-secondary">{{ $tag }}</span>
                    @endforeach
                </td>
                <td>{{ $card->category }}</td>
                <td>
                    <a href="{{ route('prompt-cards.edit', $card) }}" class="btn btn-sm btn-info">编辑</a>
                    <form action="{{ route('prompt-cards.destroy', $card) }}" method="POST" style="display:inline;">
                        @csrf @method('DELETE')
                        <button class="btn btn-sm btn-danger" onclick="return confirm('确认删除？')">删除</button>
                    </form>
                </td>
            </tr>
        @endforeach
        </tbody>
    </table>
    {{ $cards->links() }}
</div>
@endsection
