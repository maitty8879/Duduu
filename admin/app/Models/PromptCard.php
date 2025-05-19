<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromptCard extends Model
{
    protected $fillable = [
        'prompt', 'image_url', 'tags', 'category'
    ];
}
