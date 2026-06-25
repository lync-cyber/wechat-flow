<script setup lang="ts">
import { loadCredentialGroup, saveCredential } from "@wechat-flow/core";
import { onMounted, ref } from "vue";
import { useToast } from "../../composables/use-toast.ts";

const { pushToast } = useToast();

const appId = ref("");
const appSecret = ref("");
const appSecretVisible = ref(false);

onMounted(async () => {
  const group = await loadCredentialGroup("wechat");
  if (group.appId !== undefined) appId.value = group.appId;
  if (group.appSecret !== undefined) appSecret.value = group.appSecret;
});

async function save(): Promise<void> {
  try {
    await saveCredential("wechat", "appId", appId.value);
    await saveCredential("wechat", "appSecret", appSecret.value);
    pushToast({ type: "success", message: "设置已保存" });
  } catch {
    pushToast({ type: "error", message: "保存失败，请重试" });
  }
}

function toggleAppSecretVisibility(): void {
  appSecretVisible.value = !appSecretVisible.value;
}
</script>

<template>
  <div class="apikey-config">
    <div class="apikey-group">
      <h3 class="apikey-group__title">微信公众号 API 密钥</h3>

      <label class="apikey-field">
        <span class="apikey-field__label">AppID</span>
        <input
          v-model="appId"
          type="text"
          data-testid="wechat-appId"
          class="apikey-input"
          placeholder="wx..."
        />
      </label>

      <label class="apikey-field">
        <span class="apikey-field__label">AppSecret</span>
        <div class="apikey-field__input-wrap">
          <input
            v-model="appSecret"
            :type="appSecretVisible ? 'text' : 'password'"
            data-testid="wechat-appSecret"
            class="apikey-input apikey-input--secret"
            placeholder="AppSecret"
          />
          <button
            type="button"
            class="apikey-toggle"
            data-testid="wechat-appSecret-toggle"
            :title="appSecretVisible ? '隐藏' : '显示'"
            @click="toggleAppSecretVisibility"
          >
            {{ appSecretVisible ? "🙈" : "👁" }}
          </button>
        </div>
      </label>

      <div class="apikey-actions">
        <button
          type="button"
          class="apikey-btn apikey-btn--primary"
          data-testid="wechat-btn-save"
          @click="save"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apikey-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-6, 24px);
}

.apikey-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 16px);
  padding: var(--space-4, 16px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface-elevated);
}

.apikey-group__title {
  margin: 0;
  font-size: var(--font-size-base, 15px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-primary);
}

.apikey-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1, 4px);
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
}

.apikey-field__label {
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-secondary);
}

.apikey-field__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.apikey-input {
  height: 32px;
  padding: 0 var(--space-3, 12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base, 4px);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm, 13px);
  width: 100%;
}

.apikey-input--secret {
  padding-right: 36px;
}

.apikey-input:focus {
  outline: none;
  border-color: var(--color-brand);
}

.apikey-toggle {
  position: absolute;
  right: var(--space-2, 8px);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.apikey-toggle:hover {
  color: var(--color-text-secondary);
}

.apikey-actions {
  display: flex;
  gap: var(--space-3, 12px);
}

.apikey-btn {
  height: 32px;
  padding: 0 var(--space-4, 16px);
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 13px);
  cursor: pointer;
  border: 1px solid transparent;
}

.apikey-btn--primary {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.apikey-btn--primary:hover {
  background: var(--color-brand-hover);
}
</style>
