import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieApiRequest } from '../shared/GenericFunctions';

export class KieSora2Characters implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie Sora 2 Characters',
		name: 'kieSora2Characters',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Create reusable character animations from video using Sora 2',
		defaults: {
			name: 'Kie Sora 2 Characters',
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
				displayName: 'Usage Instructions',
				name: 'usageNotice',
				type: 'notice',
				default: '',
				description: 'This node generates a character_id from your video. Save this character_id to reuse the character in multiple animation jobs without re-uploading. Files are stored for 14 days only - use permanent cloud storage for production.',
			},
			{
				displayName: 'Character Video URL',
				name: 'characterFileUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/character-video.mp4',
				description: 'URL of the character video (MP4, WebM, or AVI). Must be 1-4 seconds long, max 10MB. Upload via File Upload node first.',
			},
			{
				displayName: 'Video Requirements',
				name: 'videoRequirementsNotice',
				type: 'notice',
				default: '',
				description: '• Duration: 1-4 seconds\n• Max Size: 10MB\n• Formats: MP4, WebM, AVI\n• Upload via File Upload node first',
			},
			{
				displayName: 'Character Prompt',
				name: 'characterPrompt',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'A cheerful animated character with expressive movements',
				description: 'Optional: Describe the character and animation style (max 5000 characters)',
			},
			{
				displayName: 'Safety Instruction',
				name: 'safetyInstruction',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 3,
				},
				placeholder: 'Family-friendly content only, no violence',
				description: 'Optional: Safety guidelines and content restrictions (max 5000 characters)',
			},
			{
				displayName: 'Character ID Usage',
				name: 'characterIdNotice',
				type: 'notice',
				default: '',
				description: '⚠️ IMPORTANT: The returned character_id can be reused in subsequent animation jobs. Save it from the Task Status response to avoid re-uploading the same character video.',
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
				const characterFileUrl = this.getNodeParameter('characterFileUrl', i) as string;
				const characterPrompt = this.getNodeParameter('characterPrompt', i, '') as string;
				const safetyInstruction = this.getNodeParameter('safetyInstruction', i, '') as string;
				const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

				const inputData: any = {
					character_file_url: [characterFileUrl],
				};

				if (characterPrompt) {
					inputData.character_prompt = characterPrompt;
				}

				if (safetyInstruction) {
					inputData.safety_instruction = safetyInstruction;
				}

				const body: any = {
					model: 'sora-2-characters',
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
