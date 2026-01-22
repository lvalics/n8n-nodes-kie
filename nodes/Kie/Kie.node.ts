import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { fileUploadOperations, fileUploadFields } from './utils/FileUpload';
import { seedreamOperations, seedreamFields } from './images/Seedream';
import { kieApiRequest, kieFileApiRequest } from './GenericFunctions';

export class Kie implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie',
		name: 'kie',
		icon: 'file:kie.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Kie.ai API',
		defaults: {
			name: 'Kie',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'kieApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.kie.ai',
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		/**
		 * In the properties array we have two mandatory options objects required
		 *
		 * [Resource & Operation]
		 *
		 * https://docs.n8n.io/integrations/creating-nodes/code/create-first-node/#resources-and-operations
		 *
		 */
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File Upload',
						value: 'fileUpload',
					},
					{
						name: 'Seedream (Image Generation)',
						value: 'seedream',
					},
				],
				default: 'fileUpload',
			},

			// Import operations and fields from service files
			...fileUploadOperations,
			...fileUploadFields,
			...seedreamOperations,
			...seedreamFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'fileUpload') {
					let responseData;

					if (operation === 'uploadUrl') {
						// Upload from URL
						const fileUrl = this.getNodeParameter('fileUrl', i) as string;
						let fileName = this.getNodeParameter('fileName', i, '') as string;
						const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

						// Generate random filename if not provided
						if (!fileName) {
							// Try to extract extension from URL
							const urlParts = fileUrl.split('?')[0].split('.');
							let extension = 'jpg'; // default extension

							if (urlParts.length > 1) {
								const ext = urlParts[urlParts.length - 1].toLowerCase();
								// Common image/video/audio extensions
								if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'mp3', 'wav', 'pdf', 'doc', 'docx'].includes(ext)) {
									extension = ext;
								}
							}

							// Generate random filename with timestamp
							const randomString = Math.random().toString(36).substring(2, 10);
							const timestamp = Date.now();
							fileName = `file-${timestamp}-${randomString}.${extension}`;
						}

						const body: any = {
							fileUrl,
							fileName,
						};

						if (uploadPath) {
							body.uploadPath = uploadPath;
						}

						responseData = await kieFileApiRequest.call(
							this,
							'POST',
							'/api/file-url-upload',
							body,
						);
					} else if (operation === 'uploadStream') {
						// Upload File Stream
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const fileName = this.getNodeParameter('fileName', i, '') as string;
						const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const formData: any = {
							file: {
								value: dataBuffer,
								options: {
									filename: fileName || binaryData.fileName || 'file',
									contentType: binaryData.mimeType,
								},
							},
						};

						if (fileName) {
							formData.fileName = fileName;
						}

						if (uploadPath) {
							formData.uploadPath = uploadPath;
						}

						responseData = await kieFileApiRequest.call(
							this,
							'POST',
							'/api/file-stream-upload',
							{},
							{},
							{
								formData,
								json: false,
							},
						);

						// Parse response if it's a string
						if (typeof responseData === 'string') {
							responseData = JSON.parse(responseData);
						}
					} else if (operation === 'uploadBase64') {
						// Upload Base64
						const base64Data = this.getNodeParameter('base64Data', i) as string;
						let fileName = this.getNodeParameter('fileName', i, '') as string;
						const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

						// Generate random filename if not provided
						if (!fileName) {
							let extension = 'bin'; // default extension

							// Try to extract extension from base64 data URL
							const dataUrlMatch = base64Data.match(/data:([^;]+);/);
							if (dataUrlMatch) {
								const mimeType = dataUrlMatch[1];
								const mimeToExt: { [key: string]: string } = {
									'image/jpeg': 'jpg',
									'image/jpg': 'jpg',
									'image/png': 'png',
									'image/gif': 'gif',
									'image/webp': 'webp',
									'video/mp4': 'mp4',
									'audio/mp3': 'mp3',
									'audio/mpeg': 'mp3',
									'application/pdf': 'pdf',
								};
								extension = mimeToExt[mimeType] || 'bin';
							}

							// Generate random filename with timestamp
							const randomString = Math.random().toString(36).substring(2, 10);
							const timestamp = Date.now();
							fileName = `file-${timestamp}-${randomString}.${extension}`;
						}

						const body: any = {
							base64Data,
							fileName,
						};

						if (uploadPath) {
							body.uploadPath = uploadPath;
						}

						responseData = await kieFileApiRequest.call(
							this,
							'POST',
							'/api/file-base64-upload',
							body,
						);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				} else if (resource === 'seedream') {
					let responseData;

					if (operation === 'textToImage') {
						// Text to Image
						const prompt = this.getNodeParameter('prompt', i) as string;
						const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
						const quality = this.getNodeParameter('quality', i) as string;
						const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

						const body: any = {
							model: 'seedream/4.5-text-to-image',
							input: {
								prompt,
								aspect_ratio: aspectRatio,
								quality,
							},
						};

						if (callBackUrl) {
							body.callBackUrl = callBackUrl;
						}

						responseData = await kieApiRequest.call(
							this,
							'POST',
							'/api/v1/jobs/createTask',
							body,
						);
					} else if (operation === 'editImage') {
						// Edit Image
						const prompt = this.getNodeParameter('prompt', i) as string;
						const imageUrlsString = this.getNodeParameter('imageUrls', i) as string;
						const aspectRatio = this.getNodeParameter('aspectRatio', i) as string;
						const quality = this.getNodeParameter('quality', i) as string;
						const callBackUrl = this.getNodeParameter('callBackUrl', i, '') as string;

						// Parse comma-separated URLs
						const imageUrls = imageUrlsString.split(',').map(url => url.trim()).filter(url => url);

						const body: any = {
							model: 'seedream/4.5-edit',
							input: {
								prompt,
								image_urls: imageUrls,
								aspect_ratio: aspectRatio,
								quality,
							},
						};

						if (callBackUrl) {
							body.callBackUrl = callBackUrl;
						}

						responseData = await kieApiRequest.call(
							this,
							'POST',
							'/api/v1/jobs/createTask',
							body,
						);
					} else if (operation === 'getTask') {
						// Get Task Status
						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await kieApiRequest.call(
							this,
							'GET',
							`/api/v1/jobs/${taskId}`,
							{},
						);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
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
