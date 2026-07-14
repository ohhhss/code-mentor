import { useCallback, useState } from 'react';
import type { ApiKeyConfig } from '@/types';

const STORAGE_KEY = 'code-mentor-api-config';

function readConfig(): ApiKeyConfig | null {
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item) as ApiKeyConfig;
    if (
      parsed &&
      typeof parsed.apiKey === 'string' &&
      typeof parsed.baseUrl === 'string' &&
      parsed.apiKey &&
      parsed.baseUrl
    ) {
      return {
        apiKey: parsed.apiKey,
        baseUrl: parsed.baseUrl,
        model: typeof parsed.model === 'string' ? parsed.model : 'deepseek-chat',
      };
    }
    return null;
  } catch (error) {
    console.error(`Error reading localStorage key "${STORAGE_KEY}":`, error);
    return null;
  }
}

export function useApiKey() {
  const [config, setConfig] = useState<ApiKeyConfig | null>(() => readConfig());

  const saveConfig = useCallback((apiKey: string, baseUrl: string, model: string) => {
    const trimmedKey = apiKey.trim();
    const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');
    const next: ApiKeyConfig = { apiKey: trimmedKey, baseUrl: trimmedUrl, model };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error(`Error setting localStorage key "${STORAGE_KEY}":`, error);
    }
    setConfig(next);
  }, []);

  const clearConfig = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error(`Error removing localStorage key "${STORAGE_KEY}":`, error);
    }
    setConfig(null);
  }, []);

  return { config, saveConfig, clearConfig };
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
}

export async function fetchModels(
  apiKey: string,
  baseUrl: string
): Promise<{ success: boolean; models?: ModelInfo[]; message?: string }> {
  const trimmedKey = apiKey.trim();
  const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');

  if (!trimmedKey) {
    return { success: false, message: 'API Key 不能为空' };
  }
  if (!trimmedUrl) {
    return { success: false, message: 'Base URL 不能为空' };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${trimmedUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || errBody?.message || '';
      } catch {
        // ignore
      }
      const prefix = `请求失败（HTTP ${response.status}）`;
      return { success: false, message: detail ? `${prefix}：${detail}` : prefix };
    }

    const data = await response.json();
    const models: ModelInfo[] = (data?.data || []).map(
      (m: { id: string; owned_by?: string }) => ({
        id: m.id,
        ownedBy: m.owned_by,
      })
    );

    if (models.length === 0) {
      return { success: false, message: 'API 返回的模型列表为空' };
    }

    return { success: true, models };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, message: '获取模型列表超时（10 秒未响应）' };
    }
    if (error instanceof TypeError) {
      return {
        success: false,
        message: '网络错误：无法连接到服务器，请检查 Base URL 是否正确',
      };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `获取模型列表失败：${msg}` };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function testConnection(
  apiKey: string,
  baseUrl: string,
  model: string = 'deepseek-chat'
): Promise<{ success: boolean; message: string }> {
  const trimmedKey = apiKey.trim();
  const trimmedUrl = baseUrl.trim().replace(/\/+$/, '');

  if (!trimmedKey) {
    return { success: false, message: 'API Key 不能为空' };
  }
  if (!trimmedUrl) {
    return { success: false, message: 'Base URL 不能为空' };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${trimmedUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || errBody?.message || '';
      } catch {
        // ignore JSON parse errors for error body
      }
      const prefix = `请求失败（HTTP ${response.status}）`;
      return { success: false, message: detail ? `${prefix}：${detail}` : prefix };
    }

    return { success: true, message: '连接成功，API Key 配置正确' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, message: '连接超时，请检查网络或 Base URL 是否可达（10 秒内未响应）' };
    }
    if (error instanceof TypeError) {
      return {
        success: false,
        message: '网络错误：无法连接到服务器，请检查 Base URL 是否正确以及网络是否通畅',
      };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `连接失败：${msg}` };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
