<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PromptCard;
use App\Services\CozeService;

class PromptCardController extends Controller
{
    protected $cozeService;
    
    public function __construct(CozeService $cozeService)
    {
        $this->cozeService = $cozeService;
    }
    
    /**
     * 显示图片测试页面
     */
    public function testImage()
    {
        $cards = PromptCard::latest()->take(6)->get();
        return view('admin.prompt-cards.test-image', compact('cards'));
    }

    public function index()
    {
        $cards = PromptCard::orderBy('created_at', 'desc')->paginate(20);
        return view('admin.prompt-cards.index', compact('cards'));
    }

    public function create()
    {
        return view('admin.prompt-cards.create');
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'prompt' => 'required|string',
                'category' => 'nullable|string',
            ]);
            
            \Log::info('开始创建新卡片', [
                'prompt' => $request->prompt,
                'category' => $request->category
            ]);
    
            try {
                $coze = app(CozeService::class);
                $aiResult = $coze->generateImage($request->prompt);
                
                // 调试信息 - 输出API调用结果
                \Log::info('API调用结果:', ['result' => $aiResult]);
                
                $imageUrl = $aiResult['outputs']['image_url'] ?? null;
                $tags = $aiResult['outputs']['tags'] ?? [];
            } catch (\Exception $e) {
                \Log::error('生成图片失败，使用默认值', [
                    'error' => $e->getMessage()
                ]);
                
                // 如果生成图片失败，使用默认值
                $imageUrl = 'https://via.placeholder.com/512x512?text=' . urlencode($request->prompt);
                $tags = ['default', $request->category ?: 'uncategorized'];
            }
            
            // 创建卡片记录，确保即使没有图片也能创建成功
            $card = PromptCard::create([
                'prompt' => $request->prompt,
                'image_url' => $imageUrl ?: 'https://via.placeholder.com/512x512?text=No+Image',
                'tags' => json_encode($tags ?: []),
                'category' => $request->category ?: '',
            ]);
            
            \Log::info('卡片已成功创建:', ['card_id' => $card->id]);
    
            return redirect()->route('prompt-cards.index')->with('success', '卡片已添加');
        } catch (\Exception $e) {
            \Log::error('创建卡片失败', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()
                ->withInput()
                ->with('error', '创建卡片失败: ' . $e->getMessage());
        }
    }

    public function edit(PromptCard $promptCard)
    {
        return view('admin.prompt-cards.edit', compact('promptCard'));
    }

    public function update(Request $request, PromptCard $promptCard)
    {
        $request->validate([
            'prompt' => 'required|string',
            'category' => 'nullable|string',
        ]);

        $promptCard->update([
            'prompt' => $request->prompt,
            'category' => $request->category,
            'tags' => json_encode($request->tags ?? []),
        ]);

        return redirect()->route('prompt-cards.index')->with('success', '卡片已更新');
    }

    public function destroy(PromptCard $promptCard)
    {
        $promptCard->delete();
        return redirect()->route('prompt-cards.index')->with('success', '卡片已删除');
    }
    
    /**
     * API方法：生成图片
     */
    public function apiGenerateImage(Request $request)
    {
        // 记录请求开始
        \Log::info('API生成图片请求开始', [
            'request_content' => $request->getContent(),
            'headers' => $request->headers->all(),
            'method' => $request->method(),
            'path' => $request->path()
        ]);
        
        try {
            // 检查请求是否包含提示词
            if (!$request->has('prompt') && !$request->json('prompt')) {
                \Log::warning('API请求缺少prompt参数', [
                    'request_content' => $request->getContent(),
                    'request_all' => $request->all()
                ]);
                
                return response()->json([
                    'success' => false,
                    'error' => '缺少提示词参数'
                ], 400);
            }
            
            // 获取提示词，兼容不同的请求格式
            $prompt = $request->input('prompt') ?? $request->json('prompt');
            
            \Log::info('开始生成图片', [
                'prompt' => $prompt
            ]);
            
            // 使用CozeService生成图片
            $result = $this->cozeService->generateImage($prompt);
            
            \Log::info('图片生成结果', [
                'result' => $result
            ]);
            
            $response = [
                'success' => true,
                'imageUrl' => $result['outputs']['image_url'] ?? null,
                'tags' => $result['outputs']['tags'] ?? []
            ];
            
            \Log::info('返回响应', $response);
            
            return response()->json($response);
        } catch (\Exception $e) {
            \Log::error('API生成图片失败', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
