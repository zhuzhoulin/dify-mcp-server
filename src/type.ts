// 定义通用控件接口
interface FormControl {
    label: string;
    variable: string;
    required: boolean;
    default: string;
}

// 定义文本输入控件接口
interface TextInputControl extends FormControl {}

// 定义段落文本输入控件接口
interface ParagraphControl extends FormControl {}

// 定义下拉控件接口
interface SelectControl extends FormControl {
    options: string[];
}

// 定义文件上传控件接口
interface FileUploadControl extends FormControl {
    image: ImageControl;
}

// 定义图片控件接口
interface ImageControl {
    enabled: boolean;
    number_limits: number;
    transfer_methods: string[];
}

// 定义系统参数接口
interface SystemParameters {
    file_size_limit: number;
    image_file_size_limit: number;
    audio_file_size_limit: number;
    video_file_size_limit: number;
}

// 定义 user_input_form 表单项接口
interface UserInputFormItem {
    'text-input'?: TextInputControl;
    'paragraph'?: ParagraphControl;
    'select'?: SelectControl;
    'file_upload'?: FileUploadControl;
    'image'?: ImageControl;
}

// 定义 /parameters 接口返回类型
export interface ParametersResponse {
    user_input_form: UserInputFormItem[];
    system_parameters: SystemParameters;
}

// 在 src/type.ts 中添加以下内容
export interface InfoResponse {
    name: string;
    description: string;
    tags: string[];
}

// 定义 RunWorkflowRequest 接口
export interface RunWorkflowRequest {
    inputs: Record<string, any>;
    response_mode: 'streaming' | 'blocking';
    user: string;
    files?: Array<{
        type: 'document' | 'image' | 'audio' | 'video' | 'custom';
        transfer_method: 'remote_url' | 'local_file';
        url?: string;
        upload_file_id?: string;
    }>;
}

// 定义 CompletionResponse 接口
export interface CompletionResponse {
    workflow_run_id: string;
    task_id: string;
    data: {
        id: string;
        workflow_id: string;
        status: 'running' | 'succeeded' | 'failed' | 'stopped';
        outputs?: any;
        error?: string;
        elapsed_time?: number;
        total_tokens?: number;
        total_steps: number;
        created_at: string;
        finished_at?: string;
    };
}
