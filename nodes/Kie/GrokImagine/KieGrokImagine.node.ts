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
		description: 'Transform images into video with text prompt',
	},
];

const ASPECT_RATIO_OPTIONS: INodePropertyOptions[] = [
	{
		name: '2:3 (Portrait)',
		value: '2:3',
	},
	{
		name: '3:2 (Landscape)',
		value: '3:2',
	},
	{
		name: '1:1 (Square)',
		value: '1:1',
	},
	{
		name: '16:9 (Wide Screen)',
		value: '16:9',
	},
	{
		name: '9:16 (Tall Screen)',
		value: '9:16',
	},
];

const MODE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Normal',
		value: 'normal',
		description: 'Balanced approach with quality motion',
	},
	{
		name: 'Fun',
		value: 'fun',
		description: 'Creative and playful interpretation',
	},
	{
		name: 'Spicy',
		value: 'spicy',
		description: 'Dynamic and intense motion effects',
	},
];

const DURATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '6 seconds',
		value: '6',
	},
	{
		name: '10 seconds',
		value: '10',
	},
];

export class KieGrokImagine implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Grok Imagine',
		name: 'kieGrokImagine',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate videos using Grok Imagine AI',
		defaults: {
			name: 'Kie Grok Imagine',
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
				placeholder: 'A camera slowly pans across a serene mountain landscape at sunset...',
				description: 'Text description of desired video motion (max 5000 characters, English). Include movement, action sequences, camera work, and timing.',
			},
			{
				displayName: 'Image URLs',
				name: 'imageUrls',
				type: 'string',
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
				description: 'Comma-separated list of external image URLs to transform into video. Cannot be used together with Task ID.',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: MODE_OPTIONS,
				default: 'normal',
				description: 'Video generation style and motion intensity',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				displayOptions: {
					show: {
						operation: ['textToVideo'],
					},
				},
				default: '2:3',
				description: 'Output video aspect ratio (text-to-video only)',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				type: 'options',
				options: DURATION_OPTIONS,
				default: '6',
				description: 'Video length in seconds',
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: '',
				placeholder: 'task_grok_12345678',
				description: 'Task ID from a previously generated Grok image. Cannot be used together with Image URLs. Use with Index to select a specific image.',
			},
			{
				displayName: 'Index',
				name: 'index',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['imageToVideo'],
					},
				},
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 5,
				},
				description: 'Selects which generated image to use when working with Task ID (0-5). Ignored if Image URLs is provided.',
			},
			{
				displayName: 'Callback URL',
				name: 'callBackUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-webhook.com/callback',
				description: 'Optional webhook URL to receive completion notification. Note: Generated video URLs are valid for 24 hours.',
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
				const mode = this.getNodeParameter('mode', i) as string;
				const duration = this.getNodeParameter('duration', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let model: string;
				let inputData: any = {
					prompt,
					mode,
					duration,
				};

				if (operation === 'textToVideo') {
					model = 'grok-imagine/text-to-video';
					const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
					inputData.aspect_ratio = aspectRatio;
				} else {
					// imageToVideo
					model = 'grok-imagine/image-to-video';
					const imageUrlsString = this.getNodeParameter('imageUrls', i, '') as string;
					const taskId = this.getNodeParameter('taskId', i, '') as string;
					const index = this.getNodeParameter('index', i, 0) as number;

					// Validate mutual exclusivity
					const hasImageUrls = imageUrlsString.trim().length > 0;
					const hasTaskId = taskId.trim().length > 0;

					if (!hasImageUrls && !hasTaskId) {
						throw new Error('Either Image URLs or Task ID must be provided for image-to-video');
					}

					if (hasImageUrls && hasTaskId) {
						throw new Error('Cannot use both Image URLs and Task ID together. Please choose one method.');
					}

					if (hasImageUrls) {
						const imageUrls = imageUrlsString
							.split(',')
							.map(url => url.trim())
							.filter(url => url);

						if (imageUrls.length === 0) {
							throw new Error('At least one image URL is required when using Image URLs');
						}

						inputData.image_urls = imageUrls;
					} else if (hasTaskId) {
						inputData.task_id = taskId;
						inputData.index = index;
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
