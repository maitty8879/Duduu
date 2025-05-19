<?php
namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class CozeService
{
    public function generateImage($prompt)
    {
        try {
            // 切换到测试模式
            Log::info('切换到测试模式生成图片');
            
            // 生成随机测试图片URL
            // 生成随机种子（1-5之间）
            $seed = rand(1, 5);
            
            // 使用Lorem Picsum作为图片源
            $imageUrl = "https://picsum.photos/seed/{$seed}/512/512";
            
            // 预定义的标签
            $predefinedTags = [
                'AI',
                '设计',
                '创意',
                '艺术',
                '提示词',
                '生成',
                '图片'
            ];
            
            // 随机选择5个不重复的标签
            $tags = [];
            while (count($tags) < 5) {
                $newTag = $predefinedTags[array_rand($predefinedTags)];
                if (!in_array($newTag, $tags)) {
                    $tags[] = $newTag;
                }
            }
            
            // 记录生成成功
            Log::info('图片生成成功', [
                'image_url' => $imageUrl,
                'tags' => $tags
            ]);
            
            // 返回结果
            return [
                'outputs' => [
                    'image_url' => $imageUrl,
                    'tags' => $tags
                ]
            ];
        }
        }
    }

