<script setup>
import { reactive, ref } from 'vue'
import { useTravelStore } from '../../stores/travel'
import StarRating from '../common/StarRating.vue'

const props = defineProps({
  plan: { type: Object, required: true },
})

const store = useTravelStore()

const form = reactive({
  rating: props.plan.summary?.rating || 0,
  highlights: props.plan.summary?.highlights || '',
  regrets: props.plan.summary?.regrets || '',
  suggestions: props.plan.summary?.suggestions || '',
  photos: [...(props.plan.summary?.photos || [])],
})

const fileInput = ref(null)
const saved = ref(false)
const saveFailed = ref(false)

// 拖拽排序状态：当前拖起与悬停的照片下标
const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

function onPhoto(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form.photos.push(reader.result)
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

// 删除后其余照片自动前移，第一张始终是封面
function removePhoto(index) {
  form.photos.splice(index, 1)
}

function onDragStart(index, event) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}

function onDragOver(index, event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = dragIndex.value !== -1 && dragIndex.value !== index ? index : -1
}

function onGridDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragOverIndex.value = -1
  }
}

function onDrop(index, event) {
  event.preventDefault()
  const from = dragIndex.value
  if (from !== -1 && from !== index) {
    const [moved] = form.photos.splice(from, 1)
    form.photos.splice(index, 0, moved)
  }
  resetDrag()
}

function onDragEnd() {
  resetDrag()
}

function resetDrag() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function save() {
  saved.value = false
  saveFailed.value = false
  if (!form.rating) return
  const ok = store.saveSummary(props.plan.id, {
    rating: form.rating,
    highlights: form.highlights,
    regrets: form.regrets,
    suggestions: form.suggestions,
    photos: [...form.photos],
  })
  if (!ok) {
    // 存储空间不足：表单内容保留，提示用户删减照片后再保存
    saveFailed.value = true
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
      <div class="photo-grid" @dragleave="onGridDragLeave">
        <div
          v-for="(photo, i) in form.photos"
          :key="i"
          class="photo"
          :class="{ dragging: dragIndex === i, 'drag-over': dragOverIndex === i }"
          draggable="true"
          title="拖动调整顺序"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @drop="onDrop(i, $event)"
          @dragend="onDragEnd"
        >
          <img :src="photo" alt="精选照片" />
          <span v-if="i === 0" class="photo-cover">封面</span>
          <button type="button" class="photo-remove" title="删除照片" @click="removePhoto(i)">×</button>
        </div>
        <button type="button" class="photo-add" @click="fileInput.click()">+</button>
      </div>
      <p class="photo-tip text-muted">拖动可调整顺序，第一张照片将作为封面展示</p>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onPhoto" />
    </div>

    <div class="flex gap-8">
      <button type="button" class="btn btn-primary" @click="save">保存总结</button>
      <span v-if="saved" class="text-success">已保存</span>
      <span v-if="!form.rating" class="text-warning">请先选择评分</span>
    </div>
    <p v-if="saveFailed" class="save-error">
      存储空间不足，本次保存失败。请删减部分精选照片后重新保存，已填写的内容不会丢失。
    </p>
  </div>
</template>

<style scoped>
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
  transition: border-color 0.15s, opacity 0.15s;
}

.photo.dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.photo.drag-over {
  border-color: var(--primary);
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.photo-cover {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1px 7px;
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  border-bottom-right-radius: 8px;
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

.photo-tip {
  font-size: 12px;
  margin-top: 6px;
}

.save-error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-light);
  color: var(--danger);
}
</style>
