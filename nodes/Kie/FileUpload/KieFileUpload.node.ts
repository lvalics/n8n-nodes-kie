import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { kieFileApiRequest } from '../shared/GenericFunctions';

export class KieFileUpload implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kie File Upload',
		name: 'kieFileUpload',
		icon: 'file:../kie.svg',
		group: ['transform'],
		version: 1,
		description: 'Upload files to Kie.ai storage',
		defaults: {
			name: 'Kie File Upload',
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
						name: 'Upload from URL',
						value: 'uploadUrl',
						description: 'Download and upload a file from a URL',
						action: 'Upload file from URL',
					},
					{
						name: 'Upload File Stream',
						value: 'uploadStream',
						description: 'Upload a file using binary stream (ideal for large files)',
						action: 'Upload file stream',
					},
					{
						name: 'Upload Base64',
						value: 'uploadBase64',
						description: 'Upload a Base64 encoded file (suitable for small files ≤10MB)',
						action: 'Upload Base64 file',
					},
				],
				default: 'uploadUrl',
			},
			// Upload URL fields
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadUrl'],
					},
				},
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'URL of the file to download and upload',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['uploadUrl', 'uploadBase64'],
					},
				},
				default: '',
				placeholder: 'my-file.jpg',
				description: 'Name for the uploaded file (optional, auto-generated if not provided)',
			},
			{
				displayName: 'Upload Path',
				name: 'uploadPath',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['uploadUrl', 'uploadStream', 'uploadBase64'],
					},
				},
				default: '',
				placeholder: 'folder/subfolder',
				description: 'Optional path where the file should be stored',
			},
			// Upload Stream fields
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadStream'],
					},
				},
				default: 'data',
				description: 'Name of the binary property containing the file data',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['uploadStream'],
					},
				},
				default: '',
				placeholder: 'my-file.jpg',
				description: 'Name for the uploaded file (optional, uses original filename if not provided)',
			},
			// Upload Base64 fields
			{
				displayName: 'Base64 Data',
				name: 'base64Data',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['uploadBase64'],
					},
				},
				default: '',
				typeOptions: {
					rows: 4,
				},
				placeholder: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
				description: 'Base64 encoded file data (with or without data URI prefix)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				if (operation === 'uploadUrl') {
					const fileUrl = this.getNodeParameter('fileUrl', i) as string;
					let fileName = this.getNodeParameter('fileName', i, '') as string;
					const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

					if (!fileName) {
						const urlParts = fileUrl.split('?')[0].split('.');
						let extension = 'jpg';

						if (urlParts.length > 1) {
							const ext = urlParts[urlParts.length - 1].toLowerCase();
							if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'mp3', 'wav', 'pdf', 'doc', 'docx'].includes(ext)) {
								extension = ext;
							}
						}

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

					if (typeof responseData === 'string') {
						responseData = JSON.parse(responseData);
					}
				} else if (operation === 'uploadBase64') {
					const base64Data = this.getNodeParameter('base64Data', i) as string;
					let fileName = this.getNodeParameter('fileName', i, '') as string;
					const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

					if (!fileName) {
						let extension = 'bin';

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
