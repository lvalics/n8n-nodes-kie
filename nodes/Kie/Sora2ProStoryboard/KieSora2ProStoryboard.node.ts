import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

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
				displayName: 'Input Mode',
				name: 'inputMode',
				type: 'options',
				options: [
					{
						name: 'Form',
						value: 'form',
						description: 'Use structured form fields',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Use raw JSON input for advanced control',
					},
				],
				default: 'form',
				description: 'Choose between form-based input or raw JSON input',
			},
			{
				displayName: 'Storyboard Instructions',
				name: 'storyboardNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
				description:
					'⚠️ CRITICAL: Shot durations must sum to EXACTLY match video duration. Add 1-10 shots (0.1-15s each)',
			},
			{
				displayName: 'Video Duration (Seconds)',
				name: 'nFrames',
				type: 'string',
				default: '15',
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
				placeholder: '10, 15, or 25',
				description: 'Total video duration in seconds (10, 15, or 25) - all shot durations must sum to this value',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
				placeholder: 'https://example.com/image.jpg',
				description: 'Optional source image URL for storyboard generation (JPEG, PNG, WebP, max 10MB)',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: 'landscape',
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
				description: 'Video aspect ratio orientation',
			},
			{
				displayName: 'Shots',
				name: 'shots',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
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
				displayOptions: {
					show: {
						inputMode: ['form'],
					},
				},
				description:
					'Sum all shot durations. Total MUST match video duration above. Example: 15s video needs shots totaling exactly 15s (e.g., 5+5+5 or 7.5+7.5)',
			},
			{
				displayName: 'JSON Input',
				name: 'jsonInput',
				type: 'json',
				default: '{\n  "shots": [\n    {\n      "Scene": "A cute fluffy kitten wearing headphones, sitting at a cozy table with cake",\n      "duration": 7.5\n    },\n    {\n      "Scene": "The same kitten, cake finished, licking lips with satisfied smile",\n      "duration": 7.5\n    }\n  ],\n  "n_frames": "15",\n  "image_urls": ["https://example.com/image.jpg"],\n  "aspect_ratio": "landscape"\n}',
				displayOptions: {
					show: {
						inputMode: ['json'],
					},
				},
				description: 'Raw JSON input for storyboard configuration. Must include: shots (array), n_frames (string), aspect_ratio (string), optional image_urls (array)',
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
				const inputMode = this.getNodeParameter('inputMode', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				let body: any;

				if (inputMode === 'json') {
					// JSON mode - use raw JSON input
					const jsonInput = this.getNodeParameter('jsonInput', i) as object;

					// Validate required fields in JSON
					if (!jsonInput || typeof jsonInput !== 'object') {
						throw new Error('Invalid JSON input');
					}

					const inputData = jsonInput as any;

					if (!inputData.shots || !Array.isArray(inputData.shots)) {
						throw new Error('JSON must include "shots" array');
					}

					if (!inputData.n_frames) {
						throw new Error('JSON must include "n_frames"');
					}

					if (!inputData.aspect_ratio) {
						throw new Error('JSON must include "aspect_ratio"');
					}

					// Basic validation
					if (inputData.shots.length === 0) {
						throw new Error('At least one shot is required');
					}

					if (inputData.shots.length > 10) {
						throw new Error('Maximum 10 shots allowed');
					}

					body = {
						model: 'sora-2-pro-storyboard',
						input: inputData,
					};
				} else {
					// Form mode - use structured fields
					const nFrames = this.getNodeParameter('nFrames', i) as string;
					const imageUrl = this.getNodeParameter('imageUrl', i) as string;
					const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
					const shotsData = this.getNodeParameter('shots', i) as any;

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
					const targetDuration = parseFloat(nFrames);
					if (isNaN(targetDuration)) {
						throw new Error('Video duration must be a valid number');
					}

					// Allow small floating point tolerance (0.1s)
					if (Math.abs(totalDuration - targetDuration) > 0.1) {
						throw new Error(
							`Total shot durations (${totalDuration}s) must equal selected video duration (${targetDuration}s). Current difference: ${Math.abs(totalDuration - targetDuration).toFixed(1)}s`,
						);
					}

					body = {
						model: 'sora-2-pro-storyboard',
						input: {
							shots: formattedShots,
							n_frames: nFrames,
							aspect_ratio: aspectRatio,
						},
					};

					// Only include image_urls if an image URL is provided
					if (imageUrl && imageUrl.trim().length > 0) {
						body.input.image_urls = [imageUrl];
					}
				}

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
