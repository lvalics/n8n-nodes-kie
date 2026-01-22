import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { fileUploadOperations, fileUploadFields } from './utils/FileUpload';
import { kieFileApiRequest } from './GenericFunctions';

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
				],
				default: 'fileUpload',
			},

			// Import operations and fields from service files
			...fileUploadOperations,
			...fileUploadFields,
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
						const fileName = this.getNodeParameter('fileName', i, '') as string;
						const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

						const body: any = {
							fileUrl,
						};

						if (fileName) {
							body.fileName = fileName;
						}

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
						const fileName = this.getNodeParameter('fileName', i, '') as string;
						const uploadPath = this.getNodeParameter('uploadPath', i, '') as string;

						const body: any = {
							base64Data,
						};

						if (fileName) {
							body.fileName = fileName;
						}

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
