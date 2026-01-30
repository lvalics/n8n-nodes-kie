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
		name: 'Text-to-Video',
		value: 'textToVideo',
		description: 'Generate video from text prompt only',
	},
	{
		name: 'Image-to-Video',
		value: 'imageToVideo',
		description: 'Generate video from images with optional text prompt',
	},
];

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Landscape',
		value: 'landscape',
	},
	{
		name: 'Portrait',
		value: 'portrait',
	},
];

const DURATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '10 Seconds',
		value: '10',
	},
	{
		name: '15 Seconds',
		value: '15',
	},
];

const SIZE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Standard',
		value: 'standard',
	},
	{
		name: 'High',
		value: 'high',
	},
];

export class KieSora2Pro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Sora 2 Pro',
		name: 'kieSora2Pro',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate professional videos using Sora 2 Pro with optional character animations',
		defaults: {
			name: 'Kie Sora 2 Pro',
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
				default: 'textToVideo',
				description: 'Choose the video generation mode',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['textToVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A happy dog running in the garden',
				description: 'Text description of desired video motion content (max 10,000 characters)',
			},
			{
				displayName: 'Image URLs',
				name: 'imageUrls',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Comma-separated list of source image URLs for video generation',
			},
			{
				displayName: 'Prompt',
				name: 'promptImageToVideo',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 3,
				},
				placeholder: 'Smooth camera pan across the scene',
				description: 'Optional: Text description to guide the video generation',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: 'landscape',
				description: 'Video aspect ratio orientation',
			},
			{
				displayName: 'Duration',
				name: 'nFrames',
				type: 'options',
				options: DURATION_OPTIONS,
				default: '10',
				description: 'Video duration in seconds (10s or 15s)',
			},
			{
				displayName: 'Quality',
				name: 'size',
				type: 'options',
				options: SIZE_OPTIONS,
				default: 'high',
				description: 'Video quality/resolution level',
			},
			{
				displayName: 'Remove Watermark',
				name: 'removeWatermark',
				type: 'boolean',
				default: false,
				description: 'Whether to remove watermark from generated video',
			},
			{
				displayName: 'Character IDs',
				name: 'characterIdList',
				type: 'string',
				default: '',
				placeholder: 'char_123, char_456, char_789',
				description: 'Optional: Comma-separated list of character IDs from Sora 2 Characters (max 5). Use for enhanced character animation integration.',
			},
			{
				displayName: 'Character ID Usage',
				name: 'characterIdNotice',
				type: 'notice',
				default: '',
				description: '💡 TIP: Use character IDs from Kie Sora 2 Characters node to integrate pre-animated characters into your videos. Up to 5 character IDs supported.',
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
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
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const nFrames = this.getNodeParameter('nFrames', i) as string;
				const size = this.getNodeParameter('size', i) as string;
				const removeWatermark = this.getNodeParameter('removeWatermark', i) as boolean;
				const characterIdListString = this.getNodeParameter('characterIdList', i, '') as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let model: string;
				let inputData: any = {
					aspect_ratio: aspectRatio,
					n_frames: nFrames,
					size,
					remove_watermark: removeWatermark,
				};

				if (operation === 'textToVideo') {
					model = 'sora-2-pro-text-to-video';
					const prompt = this.getNodeParameter('prompt', i) as string;
					inputData.prompt = prompt;
				} else {
					// imageToVideo
					model = 'sora-2-pro-image-to-video';
					const imageUrlsString = this.getNodeParameter('imageUrls', i) as string;
					const prompt = this.getNodeParameter('promptImageToVideo', i, '') as string;

					const imageUrls = imageUrlsString
						.split(',')
						.map(url => url.trim())
						.filter(url => url);

					if (imageUrls.length === 0) {
						throw new Error('At least one image URL is required for image-to-video');
					}

					inputData.image_urls = imageUrls;
					if (prompt) {
						inputData.prompt = prompt;
					}
				}

				// Parse character IDs if provided (max 5)
				if (characterIdListString) {
					const characterIds = characterIdListString
						.split(',')
						.map(id => id.trim())
						.filter(id => id);

					if (characterIds.length > 5) {
						throw new Error('Maximum 5 character IDs allowed');
					}

					if (characterIds.length > 0) {
						inputData.character_id_list = characterIds;
					}
				}

				const body: any = {
					model,
					input: inputData,
				};

				if (callBackUrl) {
					body.callBackUrl = callBackUrl;
				}

				const responseData = await kieApiRequest.call(
					this,
					'POST',
					'/api/v1/jobs/createTask',
					body,
				);

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
