import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';
import { ASPECT_RATIO_OPTIONS, QUALITY_OPTIONS } from '../shared/Constants';

export class KieSeedream implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Seedream',
		name: 'kieSeedream',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate or edit images using text prompts with Kie.ai Seedream',
		defaults: {
			name: 'Kie Seedream',
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
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A beautiful sunset over mountains',
				description: 'Text description to generate or edit an image',
			},
			{
				displayName: 'Image URLs',
				name: 'imageUrls',
				type: 'string',
				required: false,
				default: '',
				typeOptions: {
					rows: 2,
				},
				placeholder: 'https://example.com/image1.jpg, https://example.com/image2.jpg',
				description: 'Optional comma-separated list of image URLs to edit. If empty, generates a new image from the prompt.',
			},
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				options: ASPECT_RATIO_OPTIONS,
				default: '1:1',
				description: 'Aspect ratio for the generated or edited image',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: QUALITY_OPTIONS,
				default: 'basic',
				description: 'Quality level of the generated or edited image',
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
				const prompt = this.getNodeParameter('prompt', i) as string;
				const imageUrlsString = this.getNodeParameter('imageUrls', i, '') as string;
				const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
				const quality = this.getNodeParameter('quality', i) as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				// Parse image URLs if provided
				const imageUrls = imageUrlsString
					? imageUrlsString.split(',').map(url => url.trim()).filter(url => url)
					: [];

				// Choose model based on whether images are provided
				const model = imageUrls.length > 0 ? 'seedream/4.5-edit' : 'seedream/4.5-text-to-image';

				const body: any = {
					model,
					input: {
						prompt,
						aspect_ratio: aspectRatio,
						quality,
					},
				};

				// Only include image_urls if they exist
				if (imageUrls.length > 0) {
					body.input.image_urls = imageUrls;
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
