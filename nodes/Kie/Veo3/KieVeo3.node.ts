import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const OPERATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Generate Video',
		value: 'generateVideo',
		description: 'Create video from text prompt or images',
	},
	{
		name: 'Extend Video',
		value: 'extendVideo',
		description: 'Extend an existing video with new content',
	},
	{
		name: 'Get 1080P',
		value: 'get1080p',
		description: 'Upgrade video to 1080P resolution (16:9 only)',
	},
	{
		name: 'Get 4K',
		value: 'get4k',
		description: 'Upgrade video to 4K resolution (16:9 or 9:16 only)',
	},
];

const MODEL_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Veo3 (Quality)',
		value: 'veo3',
		description: 'High quality generation',
	},
	{
		name: 'Veo3 Fast (Speed)',
		value: 'veo3_fast',
		description: 'Faster, cost-efficient generation',
	},
];

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '16:9 (Landscape)',
		value: '16:9',
	},
	{
		name: '9:16 (Portrait)',
		value: '9:16',
	},
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
];

const GENERATION_TYPE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Auto Detect',
		value: 'auto',
		description: 'Automatically detect generation mode based on inputs',
	},
	{
		name: 'Text-to-Video',
		value: 'TEXT_2_VIDEO',
		description: 'Generate video using text prompts only',
	},
	{
		name: 'First and Last Frames-to-Video',
		value: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
		description: 'Generate transition video using one or two images',
	},
	{
		name: 'Reference-to-Video',
		value: 'REFERENCE_2_VIDEO',
		description: 'Material-to-video based on reference images (Fast model only, 16:9 & 9:16)',
	},
];

export class KieVeo3 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Veo3',
		name: 'kieVeo3',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate, extend, and enhance videos using Google Veo 3.1',
		defaults: {
			name: 'Kie Veo3',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'kieApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: OPERATION_OPTIONS,
				default: 'generateVideo',
				description: 'Choose the operation to perform',
			},

			// Generate Video fields
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A cat walking on the beach at sunset',
				description: 'Text description of desired video content',
			},
			{
				displayName: 'Image URLs',
				name: 'imageUrls',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Optional: 1-2 comma-separated image URLs for image-to-video generation',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: MODEL_OPTIONS,
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: 'veo3_fast',
				description: 'Quality vs speed trade-off',
			},
			{
				displayName: 'Generation Type',
				name: 'generationType',
				type: 'options',
				options: GENERATION_TYPE_OPTIONS,
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: 'auto',
				description: 'Generation mode - auto-detect or specify explicitly',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: '16:9',
				description: 'Video aspect ratio (only 16:9 and 9:16 support 1080P/4K upgrades)',
			},
			{
				displayName: 'Seed',
				name: 'seeds',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: 10000,
				typeOptions: {
					minValue: 10000,
					maxValue: 99999,
				},
				description: 'Random seed for reproducible results (10000-99999)',
			},
			{
				displayName: 'Watermark',
				name: 'watermark',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: '',
				placeholder: 'My Brand',
				description: 'Optional text watermark overlay',
			},
			{
				displayName: 'Enable Translation',
				name: 'enableTranslation',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: true,
				description: 'Whether to enable automatic prompt translation',
			},
			{
				displayName: 'Enable Fallback',
				name: 'enableFallback',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['generateVideo'],
					},
				},
				default: false,
				description: 'Whether to enable fallback model if primary generation fails',
			},

			// Extend Video fields
			{
				displayName: 'Task ID',
				name: 'taskIdExtend',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['extendVideo'],
					},
				},
				default: '',
				placeholder: 'veo_task_abc123',
				description: 'Task ID from the original video generation',
			},
			{
				displayName: 'Extension Prompt',
				name: 'promptExtend',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['extendVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 3,
				},
				placeholder: 'The dog continues running through the park',
				description: 'Describe how you want the video extended',
			},
			{
				displayName: 'Extension Notice',
				name: 'extensionNotice',
				type: 'notice',
				displayOptions: {
					show: {
						operation: ['extendVideo'],
					},
				},
				default: '',
				description:
					'⚠️ Videos generated after 1080P generation cannot be extended. Extend before upgrading resolution.',
			},
			{
				displayName: 'Seed',
				name: 'seedsExtend',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['extendVideo'],
					},
				},
				default: 10000,
				typeOptions: {
					minValue: 10000,
					maxValue: 99999,
				},
				description: 'Random seed for extension (10000-99999)',
			},
			{
				displayName: 'Watermark',
				name: 'watermarkExtend',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extendVideo'],
					},
				},
				default: '',
				placeholder: 'My Brand',
				description: 'Optional text watermark overlay',
			},

			// Get 1080P fields
			{
				displayName: 'Task ID',
				name: 'taskId1080p',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['get1080p'],
					},
				},
				default: '',
				placeholder: 'veo_task_abc123',
				description: 'Task ID from video generation (16:9 aspect ratio only)',
			},
			{
				displayName: '1080P Notice',
				name: 'notice1080p',
				type: 'notice',
				displayOptions: {
					show: {
						operation: ['get1080p'],
					},
				},
				default: '',
				description:
					'⚠️ 1080P processing takes 1-3 minutes. Only works with 16:9 videos. Returns URL directly (no taskId).',
			},
			{
				displayName: 'Video Index',
				name: 'index1080p',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['get1080p'],
					},
				},
				default: 0,
				description: 'Video index to retrieve (default: 0)',
			},

			// Get 4K fields
			{
				displayName: 'Task ID',
				name: 'taskId4k',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['get4k'],
					},
				},
				default: '',
				placeholder: 'veo_task_abc123',
				description: 'Task ID from video generation (16:9 or 9:16 aspect ratio)',
			},
			{
				displayName: '4K Notice',
				name: 'notice4k',
				type: 'notice',
				displayOptions: {
					show: {
						operation: ['get4k'],
					},
				},
				default: '',
				description:
					'⚠️ 4K processing takes 5-10 minutes and costs 2× Fast mode credits. Only 16:9 and 9:16 supported.',
			},
			{
				displayName: 'Video Index',
				name: 'index4k',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['get4k'],
					},
				},
				default: 0,
				description: 'Video index to upgrade (default: 0)',
			},

			// Callback URL (for operations that support it)
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['generateVideo', 'extendVideo', 'get4k'],
					},
				},
				default: '',
				placeholder: 'https://your-webhook.com/callback',
				description: 'Optional webhook URL to receive completion notification',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any;

				if (operation === 'generateVideo') {
					const prompt = this.getNodeParameter('prompt', i) as string;
					const imageUrlsString = this.getNodeParameter('imageUrls', i, '') as string;
					const model = this.getNodeParameter('model', i) as string;
					const generationType = this.getNodeParameter('generationType', i) as string;
					const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
					const seeds = this.getNodeParameter('seeds', i) as number;
					const watermark = this.getNodeParameter('watermark', i, '') as string;
					const enableTranslation = this.getNodeParameter('enableTranslation', i) as boolean;
					const enableFallback = this.getNodeParameter('enableFallback', i) as boolean;
					const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

					const body: any = {
						prompt,
						model,
						aspect_ratio: aspectRatio,
						seeds,
						enableTranslation,
						enableFallback,
					};

					// Add generation type if not auto
					if (generationType !== 'auto') {
						body.generationType = generationType;
					}

					// Add image URLs if provided (auto-detects image-to-video)
					if (imageUrlsString) {
						const imageUrls = imageUrlsString
							.split(',')
							.map((url) => url.trim())
							.filter((url) => url);

						if (imageUrls.length > 0) {
							if (imageUrls.length > 2) {
								throw new Error('Maximum 2 image URLs allowed');
							}
							body.imageUrls = imageUrls;
						}
					}

					if (watermark) {
						body.watermark = watermark;
					}

					if (callBackUrl) {
						body.callBackUrl = callBackUrl;
					}

					responseData = await kieApiRequest.call(
						this,
						'POST',
						'/api/v1/veo/generate-video',
						body,
					);
				} else if (operation === 'extendVideo') {
					const taskId = this.getNodeParameter('taskIdExtend', i) as string;
					const prompt = this.getNodeParameter('promptExtend', i) as string;
					const seeds = this.getNodeParameter('seedsExtend', i) as number;
					const watermark = this.getNodeParameter('watermarkExtend', i, '') as string;
					const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

					const body: any = {
						taskId,
						prompt,
						seeds,
					};

					if (watermark) {
						body.watermark = watermark;
					}

					if (callBackUrl) {
						body.callBackUrl = callBackUrl;
					}

					responseData = await kieApiRequest.call(this, 'POST', '/api/v1/veo/extend-video', body);
				} else if (operation === 'get1080p') {
					const taskId = this.getNodeParameter('taskId1080p', i) as string;
					const index = this.getNodeParameter('index1080p', i, 0) as number;

					// GET request with query parameters
					const queryParams = `taskId=${encodeURIComponent(taskId)}&index=${index}`;

					responseData = await kieApiRequest.call(
						this,
						'GET',
						`/api/v1/veo/get-1080p-video?${queryParams}`,
					);
				} else if (operation === 'get4k') {
					const taskId = this.getNodeParameter('taskId4k', i) as string;
					const index = this.getNodeParameter('index4k', i, 0) as number;
					const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

					const body: any = {
						taskId,
						index,
					};

					if (callBackUrl) {
						body.callBackUrl = callBackUrl;
					}

					responseData = await kieApiRequest.call(this, 'POST', '/api/v1/veo/get-4k-video', body);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
