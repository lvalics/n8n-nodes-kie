import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

const DURATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: '10 Seconds',
		value: '10',
	},
	{
		name: '15 Seconds',
		value: '15',
	},
	{
		name: '25 Seconds',
		value: '25',
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

export class KieSora2ProStoryboard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Sora 2 Pro Storyboard',
		name: 'kieSora2ProStoryboard',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Create multi-shot storyboard videos with dynamic scene transitions using Sora 2 Pro',
		defaults: {
			name: 'Kie Sora 2 Pro Storyboard',
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
				displayName: 'Storyboard Instructions',
				name: 'storyboardNotice',
				type: 'notice',
				default: '',
				description:
					'⚠️ CRITICAL: Shot durations must sum to EXACTLY match video duration. Add 1-10 shots (0.1-15s each)',
			},
			{
				displayName: 'Video Duration',
				name: 'nFrames',
				type: 'options',
				options: DURATION_OPTIONS,
				default: '15',
				description: 'Total video duration in seconds - all shot durations must sum to this value',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Single source image URL for storyboard generation (JPEG, PNG, WebP, max 10MB)',
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
				displayName: 'Shots',
				name: 'shots',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					minValue: 1,
					maxValue: 10,
				},
				default: {},
				placeholder: 'Add Shot',
				description: 'Define scenes and their durations (1-10 shots total)',
				options: [
					{
						name: 'shotValues',
						displayName: 'Shot',
						values: [
							{
								displayName: 'Scene Description',
								name: 'scene',
								type: 'string',
								default: '',
								required: true,
								typeOptions: {
									rows: 4,
								},
								placeholder:
									'A cute fluffy kitten wearing headphones, sitting at a cozy table with cake, warm lighting, cinematic close-up',
								description: 'Detailed description of what happens in this shot',
							},
							{
								displayName: 'Duration (Seconds)',
								name: 'duration',
								type: 'number',
								default: 5,
								required: true,
								typeOptions: {
									minValue: 0.1,
									maxValue: 15,
									numberPrecision: 1,
								},
								description: 'Duration of this shot in seconds (0.1-15s)',
							},
						],
					},
				],
			},
			{
				displayName: '⚠️ CALCULATE BEFORE RUNNING',
				name: 'durationValidationNotice',
				type: 'notice',
				default: '',
				description:
					'Sum all shot durations. Total MUST match video duration above. Example: 15s video needs shots totaling exactly 15s (e.g., 5+5+5 or 7.5+7.5)',
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
				const nFrames = this.getNodeParameter('nFrames', i) as string;
				const imageUrl = this.getNodeParameter('imageUrl', i) as string;
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const shotsData = this.getNodeParameter('shots', i) as any;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Extract shots from the fixedCollection
				const shots = shotsData.shotValues || [];

				if (shots.length === 0) {
					throw new Error('At least one shot is required');
				}

				if (shots.length > 10) {
					throw new Error('Maximum 10 shots allowed');
				}

				// Validate and format shots
				const formattedShots: Array<{ Scene: string; duration: number }> = [];
				let totalDuration = 0;

				for (const shot of shots) {
					const scene = shot.scene as string;
					const duration = shot.duration as number;

					if (!scene || scene.trim().length === 0) {
						throw new Error('All shots must have a scene description');
					}

					if (duration < 0.1 || duration > 15) {
						throw new Error('Shot duration must be between 0.1 and 15 seconds');
					}

					formattedShots.push({
						Scene: scene.trim(),
						duration,
					});

					totalDuration += duration;
				}

				// Validate total duration matches selected video duration
				const targetDuration = parseInt(nFrames, 10);
				// Allow small floating point tolerance (0.1s)
				if (Math.abs(totalDuration - targetDuration) > 0.1) {
					throw new Error(
						`Total shot durations (${totalDuration}s) must equal selected video duration (${targetDuration}s). Current difference: ${Math.abs(totalDuration - targetDuration).toFixed(1)}s`,
					);
				}

				const body: any = {
					model: 'sora-2-pro-storyboard',
					input: {
						shots: formattedShots,
						n_frames: nFrames,
						image_urls: [imageUrl],
						aspect_ratio: aspectRatio,
					},
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
