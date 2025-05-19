@extends('layouts.app')

@section('content')
<div class="container">
    <h2>图片显示测试</h2>
    
    <div class="row">
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    测试图片1
                </div>
                <div class="card-body">
                    <img src="https://via.placeholder.com/512x512.png?text=Test+Image+1" class="img-fluid">
                    <p class="mt-2">这是一个来自placeholder.com的测试图片</p>
                </div>
            </div>
        </div>
        
        <div class="col-md-6">
            <div class="card">
                <div class="card-header">
                    测试图片2
                </div>
                <div class="card-body">
                    <img src="https://picsum.photos/512/512" class="img-fluid">
                    <p class="mt-2">这是一个来自picsum.photos的测试图片</p>
                </div>
            </div>
        </div>
    </div>
    
    <h3 class="mt-4">最近生成的图片</h3>
    <div class="row">
        @foreach($cards as $card)
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-header">
                        卡片 #{{ $card->id }}
                    </div>
                    <div class="card-body">
                        <p><strong>图片URL:</strong> <code>{{ $card->image_url }}</code></p>
                        <img src="{{ $card->image_url }}" class="img-fluid">
                        <p class="mt-2"><strong>提示词:</strong> {{ \Illuminate\Support\Str::limit($card->prompt, 50) }}</p>
                    </div>
                </div>
            </div>
        @endforeach
    </div>
</div>
@endsection
