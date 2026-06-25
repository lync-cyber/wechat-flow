<script setup lang="ts">
import { clearCredential, loadCredentialGroup, saveCredential } from "@wechat-flow/core";
import { onMounted, reactive, ref } from "vue";
import { useToast } from "../../composables/use-toast.ts";

const { pushToast } = useToast();

interface HostDef {
  id: string;
  label: string;
}

const hosts: HostDef[] = [
  { id: "local", label: "本地" },
  { id: "qiniu", label: "七牛云" },
  { id: "oss", label: "阿里云 OSS" },
  { id: "cos", label: "腾讯云 COS" },
  { id: "smms", label: "SM.MS" },
  { id: "custom", label: "自定义" },
];

const QINIU_REGIONS = ["华东", "华北", "华南", "北美", "东南亚"];

const expanded = ref<string | null>(null);

function toggle(id: string): void {
  expanded.value = expanded.value === id ? null : id;
}

const fields = reactive<Record<string, Record<string, string>>>({
  local: {},
  qiniu: { accessKey: "", secretKey: "", bucket: "", domain: "", region: "" },
  oss: { accessKey: "", secretKey: "", bucket: "", endpoint: "", region: "" },
  cos: { secretId: "", secretKey: "", bucket: "", region: "" },
  smms: { token: "" },
  custom: {
    apiEndpoint: "",
    authHeaderKey: "",
    authHeaderValue: "",
    uploadFieldName: "",
    responseJsonPath: "",
  },
});

onMounted(async () => {
  const namespaces = ["qiniu", "oss", "cos", "smms", "custom"];
  await Promise.all(
    namespaces.map(async (ns) => {
      const group = await loadCredentialGroup(ns);
      for (const [k, v] of Object.entries(group)) {
        if (fields[ns] !== undefined) {
          fields[ns][k] = v;
        }
      }
    })
  );
});

async function save(id: string): Promise<void> {
  try {
    const group = fields[id];
    if (group) {
      await Promise.all(Object.entries(group).map(([k, v]) => saveCredential(id, k, v)));
    }
    pushToast({ type: "success", message: "设置已保存" });
  } catch {
    pushToast({ type: "error", message: "保存失败，请重试" });
  }
}

async function clear(id: string): Promise<void> {
  // local has no credentials; UI never exposes clear button for it but guard explicitly
  if (id === "local") return;
  try {
    await clearCredential(id);
    const group = fields[id];
    if (group) {
      for (const k of Object.keys(group)) {
        group[k] = "";
      }
    }
  } catch {
    pushToast({ type: "error", message: "清除失败，请重试" });
  }
}
</script>

<template>
  <div class="imagehost-config">
    <div
      v-for="host in hosts"
      :key="host.id"
      class="imagehost-card"
      :data-testid="`imagehost-card-${host.id}`"
    >
      <button
        type="button"
        class="imagehost-card__header"
        :data-testid="`imagehost-toggle-${host.id}`"
        @click="toggle(host.id)"
      >
        <span class="imagehost-card__label">{{ host.label }}</span>
        <span class="imagehost-card__chevron">{{ expanded === host.id ? "▲" : "▼" }}</span>
      </button>

      <div
        v-if="expanded === host.id"
        class="imagehost-card__form"
        :data-testid="`imagehost-form-${host.id}`"
      >
        <!-- local -->
        <template v-if="host.id === 'local'">
          <p class="imagehost-card__note">本地存储无需额外凭据配置</p>
        </template>

        <!-- qiniu -->
        <template v-else-if="host.id === 'qiniu'">
          <label class="imagehost-field">
            <span>AccessKey</span>
            <input
              v-model="fields.qiniu.accessKey"
              type="password"
              :data-testid="'qiniu-accessKey'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>SecretKey</span>
            <input
              v-model="fields.qiniu.secretKey"
              type="password"
              :data-testid="'qiniu-secretKey'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>Bucket</span>
            <input
              v-model="fields.qiniu.bucket"
              type="text"
              :data-testid="'qiniu-bucket'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>Domain</span>
            <input
              v-model="fields.qiniu.domain"
              type="text"
              :data-testid="'qiniu-domain'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>区域</span>
            <select v-model="fields.qiniu.region" :data-testid="'qiniu-region'" class="imagehost-input">
              <option value="">请选择</option>
              <option v-for="r in QINIU_REGIONS" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
        </template>

        <!-- oss -->
        <template v-else-if="host.id === 'oss'">
          <label class="imagehost-field">
            <span>AccessKey</span>
            <input
              v-model="fields.oss.accessKey"
              type="password"
              :data-testid="'oss-accessKey'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>SecretKey</span>
            <input
              v-model="fields.oss.secretKey"
              type="password"
              :data-testid="'oss-secretKey'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>Bucket</span>
            <input v-model="fields.oss.bucket" type="text" :data-testid="'oss-bucket'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Endpoint</span>
            <input v-model="fields.oss.endpoint" type="text" :data-testid="'oss-endpoint'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Region</span>
            <input v-model="fields.oss.region" type="text" :data-testid="'oss-region'" class="imagehost-input" />
          </label>
        </template>

        <!-- cos -->
        <template v-else-if="host.id === 'cos'">
          <label class="imagehost-field">
            <span>SecretId</span>
            <input
              v-model="fields.cos.secretId"
              type="password"
              :data-testid="'cos-secretId'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>SecretKey</span>
            <input
              v-model="fields.cos.secretKey"
              type="password"
              :data-testid="'cos-secretKey'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>Bucket</span>
            <input v-model="fields.cos.bucket" type="text" :data-testid="'cos-bucket'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Region</span>
            <input v-model="fields.cos.region" type="text" :data-testid="'cos-region'" class="imagehost-input" />
          </label>
        </template>

        <!-- smms -->
        <template v-else-if="host.id === 'smms'">
          <label class="imagehost-field">
            <span>Token</span>
            <input
              v-model="fields.smms.token"
              type="password"
              :data-testid="'smms-token'"
              class="imagehost-input"
            />
          </label>
        </template>

        <!-- custom -->
        <template v-else-if="host.id === 'custom'">
          <label class="imagehost-field">
            <span>API Endpoint</span>
            <input v-model="fields.custom.apiEndpoint" type="text" :data-testid="'custom-apiEndpoint'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Auth Header Key</span>
            <input v-model="fields.custom.authHeaderKey" type="text" :data-testid="'custom-authHeaderKey'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Auth Header Value</span>
            <input
              v-model="fields.custom.authHeaderValue"
              type="password"
              :data-testid="'custom-authHeaderValue'"
              class="imagehost-input"
            />
          </label>
          <label class="imagehost-field">
            <span>Upload Field Name</span>
            <input v-model="fields.custom.uploadFieldName" type="text" :data-testid="'custom-uploadFieldName'" class="imagehost-input" />
          </label>
          <label class="imagehost-field">
            <span>Response JSON Path</span>
            <input v-model="fields.custom.responseJsonPath" type="text" :data-testid="'custom-responseJsonPath'" class="imagehost-input" />
          </label>
        </template>

        <div v-if="host.id !== 'local'" class="imagehost-card__actions">
          <button
            type="button"
            class="imagehost-btn imagehost-btn--primary"
            :data-testid="`${host.id}-btn-save`"
            @click="save(host.id)"
          >
            保存
          </button>
          <button
            type="button"
            class="imagehost-btn imagehost-btn--ghost"
            :data-testid="`${host.id}-btn-clear`"
            @click="clear(host.id)"
          >
            清除配置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.imagehost-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.imagehost-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface-elevated);
}

.imagehost-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 var(--space-4, 16px);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--color-text-primary);
  font-size: var(--font-size-base, 15px);
  font-weight: var(--font-weight-medium, 500);
}

.imagehost-card__header:hover {
  background: var(--color-surface-overlay);
}

.imagehost-card__chevron {
  font-size: 10px;
  color: var(--color-text-muted);
}

.imagehost-card__form {
  padding: var(--space-4, 16px);
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.imagehost-card__note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm, 13px);
}

.imagehost-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
}

.imagehost-input {
  height: 32px;
  padding: 0 var(--space-3, 12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base, 4px);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm, 13px);
}

.imagehost-input:focus {
  outline: none;
  border-color: var(--color-brand);
}

.imagehost-card__actions {
  display: flex;
  gap: var(--space-3, 12px);
  padding-top: var(--space-2, 8px);
}

.imagehost-btn {
  height: 32px;
  padding: 0 var(--space-4, 16px);
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  border: 1px solid transparent;
}

.imagehost-btn--primary {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.imagehost-btn--primary:hover {
  background: var(--color-brand-hover);
}

.imagehost-btn--ghost {
  background: none;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.imagehost-btn--ghost:hover {
  background: var(--color-surface-overlay);
}
</style>
