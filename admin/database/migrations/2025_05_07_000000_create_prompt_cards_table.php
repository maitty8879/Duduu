<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('prompt_cards', function (Blueprint $table) {
            $table->id();
            $table->text('prompt');
            $table->string('image_url')->nullable();
            $table->json('tags')->nullable();
            $table->string('category')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('prompt_cards');
    }
};
