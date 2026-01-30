import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

// Qwen-specific image size options
const QWEN_IMAGE_SIZE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'Square',
		value: 'square',
	},
	{
		name: 'Square HD',
		value: 'square_hd',
	},
	{
		name: 'Portrait 4:3',
		value: 'portrait_4_3',
	},
	{
		name: 'Portrait 16:9',
		value: 'portrait_16_9',
	},
	{
		name: 'Landscape 4:3',
		value: 'landscape_4_3',
	},
	{
		name: 'Landscape 16:9',
		value: 'landscape_16_9',
	},
];

const ACCELERATION_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'None',
		value: 'none',
	},
	{
		name: 'Regular',
		value: 'regular',
	},
	{
		name: 'High',
		value: 'high',
	},
];

const OUTPUT_FORMAT_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'PNG',
		value: 'png',
	},
	{
		name: 'JPEG',
		value: 'jpeg',
	},
];

export class KieQwen implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Qwen',
		name: 'kieQwen',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate or edit images using Kie.ai Qwen models',
		defaults: {
			name: 'Kie Qwen',
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
				noDataExpression: true,
				options: [
					{
						name: 'Generate/Transform Image',
						value: 'generateTransform',
						description: 'Generate new image from text or transform existing image',
					},
					{
						name: 'Edit Image',
						value: 'edit',
						description: 'Make specific modifications to an existing image',
					},
				],
				default: 'generateTransform',
			},
			// Help/Info notice
			{
				displayName: 'How to Use',
				name: 'notice',
				type: 'notice',
				displayOptions: {
					show: {
						operation: ['generateTransform'],
					},
				},
				default: '',
				description: 'Leave "Image URL" empty to generate from text, or provide an image URL to transform it based on your prompt',
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
				placeholder: 'A beautiful sunset over mountains',
				description: 'Text description for image generation or transformation',
			},
			// Image URL for both operations
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['generateTransform'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Optional: Provide image URL to transform it. Leave empty to generate from scratch.',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['edit'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Source image URL to edit (required)',
			},
			// Strength parameter (only for image-to-image)
			{
				displayName: 'Strength',
				name: 'strength',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['generateTransform'],
					},
				},
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				default: 0.8,
				description: 'Remix intensity when transforming an image (0-1). Only used when Image URL is provided.',
				hint: 'Higher values = more transformation, lower = stay closer to original',
			},
			{
				displayName: 'Image Size',
				name: 'imageSize',
				type: 'options',
				options: QWEN_IMAGE_SIZE_OPTIONS,
				default: 'square_hd',
				description: 'Output image dimensions',
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'blurry, low quality, distorted',
				description: 'What to avoid in the generated image (max 500 characters)',
			},
			{
				displayName: 'Advanced Options',
				name: 'advancedOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Inference Steps',
						name: 'numInferenceSteps',
						type: 'number',
						default: 30,
						typeOptions: {
							minValue: 2,
							maxValue: 250,
						},
						description: 'Number of iterations for generation (2-250). More steps = better quality but slower.',
					},
					{
						displayName: 'Guidance Scale',
						name: 'guidanceScale',
						type: 'number',
						default: 2.5,
						typeOptions: {
							minValue: 0,
							maxValue: 20,
							numberPrecision: 1,
						},
						description: 'How closely to follow the prompt (0-20). Higher = stricter adherence.',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: -1,
						description: 'Random seed for reproducible results. Use -1 for random.',
					},
					{
						displayName: 'Acceleration',
						name: 'acceleration',
						type: 'options',
						options: ACCELERATION_OPTIONS,
						default: 'none',
						description: 'Speed optimization level',
					},
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						type: 'options',
						options: OUTPUT_FORMAT_OPTIONS,
						default: 'png',
						description: 'Image output format',
					},
					{
						displayName: 'Enable Safety Checker',
						name: 'enableSafetyChecker',
						type: 'boolean',
						default: true,
						description: 'Whether to filter unsafe content',
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
				const imageUrl = this.getNodeParameter('imageUrl', i, '') as string;
				const imageSize = this.getNodeParameter('imageSize', i) as string;
				const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
				const advancedOptions = this.getNodeParameter('advancedOptions', i, {}) as any;

				let model: string;
				const input: any = {
					prompt,
					image_size: imageSize,
				};

				// Determine model based on operation and image presence
				if (operation === 'edit') {
					model = 'qwen/image-edit';
					input.image_url = imageUrl;
					// Image edit defaults
					input.num_inference_steps = advancedOptions.numInferenceSteps || 25;
					input.guidance_scale = advancedOptions.guidanceScale || 4;
				} else {
					// generateTransform operation
					if (imageUrl) {
						// Image-to-image
						model = 'qwen/image-to-image';
						input.image_url = imageUrl;
						const strength = this.getNodeParameter('strength', i, 0.8) as number;
						input.strength = strength;
					} else {
						// Text-to-image
						model = 'qwen/text-to-image';
					}
					// Generate/Transform defaults
					input.num_inference_steps = advancedOptions.numInferenceSteps || 30;
					input.guidance_scale = advancedOptions.guidanceScale || 2.5;
				}

				// Add negative prompt if provided
				if (negativePrompt) {
					input.negative_prompt = negativePrompt;
				}

				// Add advanced options
				if (advancedOptions.seed && advancedOptions.seed !== -1) {
					input.seed = advancedOptions.seed;
				}
				if (advancedOptions.acceleration) {
					input.acceleration = advancedOptions.acceleration;
				}
				if (advancedOptions.outputFormat) {
					input.output_format = advancedOptions.outputFormat;
				}
				if (advancedOptions.enableSafetyChecker !== undefined) {
					input.enable_safety_checker = advancedOptions.enableSafetyChecker;
				}

				const body: any = {
					model,
					input,
				};

				if (advancedOptions.callBackUrl) {
					body.callBackUrl = advancedOptions.callBackUrl;
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
