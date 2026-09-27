<script setup>
import { reactive, ref } from 'vue'
import { useTravelStore } from '../../stores/travel'
import { uid } from '../../utils/id'
import StarRating from '../common/StarRating.vue'

const props = defineProps({
  plan: { type: Object, required: true },
})

const store = useTravelStore()

// 照片内部结构带稳定 id，拖拽排序时 Vue 可正确复用 DOM；保存时再转回字符串数组
const form = reactive({
  rating: props.plan.summary?.rating || 0,
  highlights: props.plan.summary?.highlights || '',
  regrets: props.plan.summary?.regrets || '',
  suggestions: props.plan.summary?.suggestions || '',
  photos: (props.plan.summary?.photos || []).map((src) => ({ id: uid(), src })),
})

const fileInput = ref(null)
const saved = ref(false)
const saveError = ref('')

// 拖拽排序状态
const dragIndex = ref(null)
const dragOverIndex = ref(null)

function onPhoto(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.photos.push({ id: uid(), src: reader.result })
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function removePhoto(index) {
  // 删除后其余照片自然前移，第一张即为新封面
  form.photos.splice(index, 1)
}

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index, event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDrop(index, event) {
  event.preventDefault()
  const from = dragIndex.value
  dragIndex.value = null
  dragOverIndex.value = null
  if (from === null || from === index) return
  const [moved] = form.photos.splice(from, 1)
  form.photos.splice(index, 0, moved)
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function save() {
  saveError.value = ''
  if (!form.rating) {
    saved.value = false
    return
  }
  const result = store.saveSummary(props.plan.id, {
    rating: form.rating,
    highlights: form.highlights,
    regrets: form.regrets,
    suggestions: form.suggestions,
    photos: form.photos.map((p) => p.src),
  })
  if (!result.ok) {
    saved.value = false
    // 存储空间不足时明确提示删减后再保存，表单内容原样保留，绝不静默丢失
    saveError.value = result.isQuotaError
      ? '本地存储空间不足，本次保存未生效。请先删减部分照片（或缩短文字）后再保存，当前编辑内容仍保留。'
      : '保存失败，本地存储不可用，请稍后重试。'
    return
  }
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
  <div class="summary">
    <div class="form-group">
      <label class="form-label">总体评分</label>
      <StarRating v-model="form.rating" size="28px" />
    </div>

    <div class="form-group">
      <label class="form-label">亮点</label>
      <textarea v-model="form.highlights" class="textarea" placeholder="这次出行最难忘、最满意的地方"></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">遗憾</label>
      <textarea v-model="form.regrets" class="textarea" placeholder="未能完成或留下遗憾的地方"></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">建议</label>
      <textarea v-model="form.suggestions" class="textarea" placeholder="给下次出行的建议"></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">精选照片</label>
      <p class="photo-hint text-muted">拖动照片可调整顺序，第一张将作为封面展示</p>
      <div class="photo-grid">
        <div
          v-for="(photo, i) in form.photos"
          :key="photo.id"
          class="photo"
          :class="{ 'is-dragging': dragIndex === i, 'drag-over': dragOverIndex === i && dragIndex !== i }"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @drop="onDrop(i, $event)"
          @dragend="onDragEnd"
        >
          <img :src="photo.src" alt="精选照片" draggable="false" />
          <span v-if="i === 0" class="photo-cover-badge">封面</span>
          <span class="photo-grip" title="按住拖动调整顺序">⠿</span>
          <button type="button" class="photo-remove" title="删除照片" @click="removePhoto(i)">×</button>
        </div>
        <button type="button" class="photo-add" @click="fileInput.click()">+</button>
      </div>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onPhoto" />
    </div>

    <div class="flex gap-8" style="align-items: center; flex-wrap: wrap">
      <button type="button" class="btn btn-primary" @click="save">保存总结</button>
      <span v-if="saved" class="text-success">已保存</span>
      <span v-if="!form.rating" class="text-warning">请先选择评分</span>
      <span v-if="saveError" class="text-danger">{{ saveError }}</span>
    </div>
  </div>
</template>

<style scoped>
.photo-hint {
  font-size: 12px;
  margin-bottom: 8px;
}

.photo-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.photo {
  position: relative;
  width: 100px;
  height: 76px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  transition: opacity 0.15s, border-color 0.15s, transform 0.15s;
}

.photo:active {
  cursor: grabbing;
}

.photo.is-dragging {
  opacity: 0.4;
}

.photo.drag-over {
  border-color: var(--primary);
  transform: scale(1.04);
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.photo-cover-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  line-height: 1.4;
}

.photo-grip {
  position: absolute;
  bottom: 2px;
  left: 4px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  line-height: 1;
  cursor: pointer;
}

.photo-add {
  width: 100px;
  height: 76px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 24px;
}

.photo-add:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
