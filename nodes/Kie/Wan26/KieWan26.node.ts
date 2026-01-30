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
		description: 'Generate video from image and text prompt',
	},
	{
		name: 'Video-to-Video',
		value: 'videoToVideo',
		description: 'Transform video based on text prompt',
	},
];

const DURATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '5 seconds',
		value: '5',
	},
	{
		name: '10 seconds',
		value: '10',
	},
	{
		name: '15 seconds',
		value: '15',
	},
];

const RESOLUTION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '720p',
		value: '720p',
	},
	{
		name: '1080p',
		value: '1080p',
	},
];

export class KieWan26 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Wan 2.6',
		name: 'kieWan26',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos using Wan 2.6 models',
		defaults: {
			name: 'Kie Wan 2.6',
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
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A serene landscape with mountains and clouds',
				description: 'Text description for video generation (1-5000 characters)',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Source image URL for video generation (JPEG, PNG, or WebP, max 10MB)',
			},
			{
				displayName: 'Video URLs',
				name: 'videoUrls',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['videoToVideo'],
					},
				},
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/video1.mp4, https://example.com/video2.mp4',
				description: 'Comma-separated list of source video URLs (1-3 videos, MP4/QuickTime/Matroska, max 10MB each)',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				options: DURATION_OPTIONS,
				default: '5',
				description: 'Video duration in seconds',
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'options',
				options: RESOLUTION_OPTIONS,
				default: '1080p',
				description: 'Output video resolution',
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
				const prompt = this.getNodeParameter('prompt', i) as string;
				const duration = this.getNodeParameter('duration', i) as string;
				const resolution = this.getNodeParameter('resolution', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let model: string;
				let inputData: any = {
					prompt,
					duration,
					resolution,
				};

				if (operation === 'textToVideo') {
					model = 'wan/2-6-text-to-video';
				} else if (operation === 'imageToVideo') {
					model = 'wan/2-6-image-to-video';
					const imageUrl = this.getNodeParameter('imageUrl', i) as string;
					inputData.image_urls = [imageUrl];
				} else {
					// videoToVideo
					model = 'wan/2-6-video-to-video';
					const videoUrlsString = this.getNodeParameter('videoUrls', i) as string;
					const videoUrls = videoUrlsString
						.split(',')
						.map(url => url.trim())
						.filter(url => url);

					if (videoUrls.length === 0 || videoUrls.length > 3) {
						throw new Error('Video-to-Video requires 1-3 video URLs');
					}

					inputData.video_urls = videoUrls;
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
