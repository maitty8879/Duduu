<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\PromptCardController;

Route::get('/', function () {
    return view('welcome');
});

// 添加提示卡片管理路由
Route::resource('admin/prompt-cards', PromptCardController::class);

// 图片测试路由
Route::get('admin/test-image', [PromptCardController::class, 'testImage'])->name('test-image');

// 图片生成API
Route::post('admin/api/generate-image', [PromptCardController::class, 'apiGenerateImage'])->name('api.generate-image');
