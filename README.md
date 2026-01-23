# n8n-nodes-kie

This n8n community node enables seamless integration of **[Kie.ai](https://kie.ai)** in your [n8n](https://n8n.io) workflows. Access powerful AI models for image generation, video creation, image upscaling, and more.

## Features

- **Multiple AI Image Generation Models**: Seedream, Flux-2 Pro, Qwen, Z-Image, Google Nano Banana Pro
- **Image Upscaling**: Topaz and Recraft Crisp AI enhancement
- **Video Upscaling**: Topaz AI video enhancement
- **Video Generation**: Wan 2.6 text/image/video-to-video models
- **Audio-to-Video**: Infinitalk talking head video generation
- **File Management**: Upload files to Kie.ai storage
- **Task Status Tracking**: Monitor and retrieve generation results

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Install

```bash
npm install n8n-nodes-kie
```

## Credentials

You'll need a Kie.ai API key to use these nodes:

1. Sign up at [kie.ai](https://kie.ai)
2. Navigate to [API Key Management](https://kie.ai/api-key)
3. Generate a new API key
4. Add the API key to your n8n credentials

## Available Nodes

### Image Generation

#### Kie Seedream
Generate or edit images using Seedream 4.5 models.
- **Text-to-Image**: Create images from text descriptions
- **Image Editing**: Transform existing images based on prompts
- **Auto Mode Selection**: Automatically chooses the right model based on input
- **Aspect Ratios**: 1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2, 21:9
- **Quality Options**: Basic, High

#### Kie Flux-2 Pro
High-quality image generation using Flux-2 Pro models.
- **Text-to-Image**: Generate images from text prompts
- **Image-to-Image**: Transform existing images (1-8 images)
- **Aspect Ratios**: 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, auto
- **Resolution**: 1K, 2K
- **Prompt Length**: 3-5000 characters

#### Kie Qwen
Advanced image generation with operation modes.
- **Generate/Transform**: Text-to-image or image-to-image with strength control
- **Edit Mode**: Specific image modifications
- **Image Sizes**: square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
- **Strength Parameter**: Control transformation intensity (image-to-image)
- **Usage Hints**: Built-in interface guidance

#### Kie Z-Image
Simple text-to-image generation.
- **Text-to-Image Only**: Generate images from text descriptions
- **Aspect Ratios**: 1:1, 4:3, 3:4, 16:9, 9:16
- **Streamlined Interface**: Quick and easy image generation

#### Kie Google Nano Banana Pro
Google's advanced image-to-image model.
- **Optional Input Images**: Supports both text-to-image and image-to-image
- **Multiple Aspect Ratios**: 1:1, 9:16, 16:9, 4:3, 3:4
- **Resolution Options**: 1K, 2K, 4K
- **Output Formats**: PNG, JPEG, WebP

### Image Enhancement

#### Kie Image Upscaler
AI-powered image upscaling with dual engines.
- **Topaz AI**: Configurable upscale factors (1x, 2x, 4x, 8x)
- **Recraft Crisp**: Automatic intelligent upscaling
- **Supported Formats**: JPEG, PNG, WebP (max 10MB)
- **Service Selection**: Choose the best upscaler for your needs

### Video Enhancement

#### Kie Video Upscaler
AI-powered video upscaling using Topaz.
- **Topaz Video Enhancement**: Professional video upscaling
- **Upscale Factors**: 1x, 2x, 4x
- **Supported Formats**: MP4, QuickTime, Matroska (max 10MB)
- **Use Cases**: Video quality enhancement, content restoration, resolution upgrades

### Video Generation

#### Kie Grok Imagine
AI-powered video generation with style modes.
- **Text-to-Video**: Generate videos from detailed text descriptions
- **Image-to-Video**: Transform images into dynamic videos
- **Mode Options**: Normal (balanced), Fun (creative/playful), Spicy (intense motion)
- **Aspect Ratios**: 2:3, 3:2, 1:1, 16:9, 9:16 (text-to-video)
- **Rate Limits**: 30 concurrent tasks, 300 tasks/hour
- **Video Validity**: Generated URLs valid for 24 hours
- **Use Cases**: Dynamic content, social media videos, creative animations

#### Kie Seedance
ByteDance's versatile video generation model.
- **Text-to-Video**: Generate videos from text descriptions
- **Image-to-Video**: Animate 1-2 images with optional camera movements
- **Auto Mode Detection**: Automatically switches between text-to-video and image-to-video based on input
- **Duration**: Customizable video length (default 8 seconds)
- **Fixed Lens**: Optional stable camera positioning
- **Audio Generation**: Optional soundtrack creation (increases cost)
- **Resolution**: 720p
- **Use Cases**: Creative content, animations, image-based storytelling

#### Kie Hailuo
High-quality cinematic video generation.
- **Text-to-Video**: Generate videos from detailed text descriptions
- **Image-to-Video**: Create videos from images with text prompts
- **Prompt Optimizer**: Automatic prompt enhancement for better results
- **End Frame Control**: Optional ending image specification (image-to-video)
- **Cinematic Support**: Complex descriptions with camera movements and visual effects
- **Use Cases**: Professional video content, cinematic sequences, visual storytelling

#### Kie Wan 2.6
Versatile video generation with multiple modes.
- **Text-to-Video**: Generate videos from text descriptions only
- **Image-to-Video**: Create videos from images with text prompts
- **Video-to-Video**: Transform existing videos based on prompts
- **Duration Options**: 5, 10, or 15 seconds
- **Resolution**: 720p, 1080p
- **Auto Model Selection**: Automatically chooses the right model based on operation
- **Use Cases**: Content creation, video marketing, animation

#### Kie Infinitalk
Generate talking head videos from audio.
- **Audio-to-Video**: Animate static images with audio
- **Input**: Portrait image + audio file
- **Resolution Options**: 480p, 720p, 1080p
- **Prompt Control**: Describe desired animation style
- **Use Cases**: Avatars, presentations, content creation

### Utilities

#### Kie File Upload
Upload files to Kie.ai storage for use in other nodes.
- **Binary File Support**: Upload any file from n8n workflow
- **URL Output**: Returns hosted file URL for use in generation nodes
- **Essential**: Required before using local files in image/video nodes

#### Kie Task Status
Monitor and retrieve results from generation tasks.
- **Task Monitoring**: Query status of any Kie.ai generation job
- **Result Retrieval**: Get generated file URLs and metadata
- **Clean Response**: Automatically parses nested JSON responses
- **Polling Support**: Use in loops to wait for task completion

## Workflow Examples

### Basic Image Generation

```
1. Kie Seedream (Text-to-Image)
   - Prompt: "A beautiful sunset over mountains"
   - Aspect Ratio: 16:9
   - Quality: High
   ↓
2. Kie Task Status
   - Task ID: {{ $json.data.taskId }}
   - Wait for completion
   ↓
3. Download or use generated image
```

### Image Upscaling Pipeline

```
1. Kie Seedream (Generate Image)
   ↓
2. Kie Task Status (Get Result URL)
   ↓
3. Kie Image Upscaler (Topaz 4x)
   - Image URL: {{ $json.result.output[0] }}
   ↓
4. Kie Task Status (Get Upscaled Result)
```

### Audio-to-Video with File Upload

```
1. Read Binary File (Portrait Image)
   ↓
2. Kie File Upload (Upload Portrait)
   ↓
3. Kie Infinitalk
   - Image URL: {{ $json.data.url }}
   - Audio URL: [your audio URL]
   - Resolution: 1080p
   ↓
4. Kie Task Status (Get Video URL)
```

## API Documentation

For detailed API documentation, visit [docs.kie.ai](https://docs.kie.ai)

### Supported Models

- **seedream/4.5-text-to-image** & **seedream/4.5-edit**
- **flux-2/pro-text-to-image** & **flux-2/pro-image-to-image**
- **qwen/text-to-image**, **qwen/image-to-image** & **qwen/image-edit**
- **z-image**
- **nano-banana-pro**
- **topaz/image-upscale**
- **topaz/video-upscale**
- **recraft/crisp-upscale**
- **grok-imagine/text-to-video** & **grok-imagine/image-to-video**
- **bytedance/seedance-1.5-pro**
- **hailuo/02-text-to-video-pro** & **hailuo/02-image-to-video-pro**
- **wan/2-6-text-to-video**, **wan/2-6-image-to-video** & **wan/2-6-video-to-video**
- **infinitalk/from-audio**

## Callback URLs

All generation nodes support optional callback URLs for production use:
- Avoid polling delays
- Receive instant notifications when tasks complete
- Recommended for high-volume workflows

## Error Handling

All nodes support n8n's "Continue On Fail" option:
- Enable in node settings to handle errors gracefully
- Failed items return error details in JSON
- Workflow continues processing remaining items

## Compatibility

- **n8n Version**: 1.80.0 and above
- **Node.js**: 18.10 or higher
- **Package Manager**: pnpm 9.1 or higher

## Development

```bash
# Install dependencies
pnpm install

# Build nodes
pnpm run build

# Watch mode for development
pnpm run dev

# Format code
pnpm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/lvalics/n8n-nodes-kie/issues)
- **Documentation**: [Kie.ai Docs](https://docs.kie.ai)
- **API Status**: [kie.ai](https://kie.ai)

## License

[MIT](https://github.com/lvalics/n8n-nodes-kie/blob/master/LICENSE.md)

## Author

**Valics Lehel**
- Email: lvalics@gmail.com
- GitHub: [@lvalics](https://github.com/lvalics)

## Acknowledgments

- [n8n](https://n8n.io) - Workflow automation platform
- [Kie.ai](https://kie.ai) - AI model marketplace
- n8n community for support and feedback
