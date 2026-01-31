# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-01-31

### Added
- **Kie Grok Imagine**: Added `duration` parameter to control video length (6 or 10 seconds) for both text-to-video and image-to-video operations
- **Kie Grok Imagine**: Added `task_id` parameter to reference previously generated Grok images for image-to-video animation
- **Kie Grok Imagine**: Added `index` parameter (0-5) to select specific images from multi-image tasks when using `task_id`

### Changed
- **Kie Grok Imagine**: `imageUrls` field is no longer required - users can now choose either external image URLs or task_id + index
- **Kie Grok Imagine**: Added validation to prevent using both `imageUrls` and `task_id` parameters simultaneously

## [0.2.2] - 2026-01-30

### Added
- Sora 2 Pro Storyboard node with multi-shot video creation and dynamic scene transitions

### Fixed
- Task Status endpoint and icon format updates

## [0.2.0] - 2026-01-22

### Added
- Kie Veo3 node for Google's professional video generation and enhancement
- Kie Sora 2 Pro node for text-to-video and image-to-video with character integration
- Kie Sora 2 Characters node for reusable character animation system
- Kie Sora Watermark Remover node for professional watermark removal
- Kie Video Upscaler node with Topaz AI enhancement

## [0.1.0] - 2025-01-20

### Added
- Initial release with 8 AI nodes:
  - Kie Seedream (text-to-image and image editing)
  - Kie Flux-2 Pro (high-quality image generation)
  - Kie Qwen (advanced image generation with operation modes)
  - Kie Z-Image (simple text-to-image)
  - Kie Google Nano Banana Pro (Google's image-to-image model)
  - Kie Grok Imagine (AI-powered video generation)
  - Kie Hailuo (cinematic video generation)
  - Kie Wan 2.6 (versatile video generation)
  - Kie Seedance (ByteDance video generation)
  - Kie Infinitalk (audio-to-video talking heads)
  - Kie Image Upscaler (Topaz and Recraft AI upscaling)
  - Kie File Upload (file management)
  - Kie Task Status (task monitoring and result retrieval)
- Kie.ai API credentials integration
- Support for callback URLs
- Error handling with "Continue On Fail" option
