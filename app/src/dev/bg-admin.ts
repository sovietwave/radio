type BackgroundAdminEntry = {
     path: string
     tags: string[]
     mobilePath: string | null
     folder: string
     hasMobile: boolean
}

type BackgroundAdminPayload = {
     entries: BackgroundAdminEntry[]
     folders: string[]
     tags: string[]
}

const API_URL = '/__bg-admin/api/manifest'

const state = {
     entries: [] as BackgroundAdminEntry[],
     folders: [] as string[],
     tags: [] as string[],
     folder: 'all',
     search: '',
     onlyMissingMobile: false,
     dirty: false,
     saving: false,
     loading: true,
     message: '',
     error: '',
}

const app = document.getElementById('app')

if (!app) {
     throw new Error('Background admin root node not found')
}

const phoneIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
     <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v14h10V5H7Zm5 12.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm-.9-12.25 1.5 3h-1.7l.7 1.8-2.1 4.2h1.7l-.7 3 4.4-6h-1.8l1.2-3H11.1Z"/>
</svg>`

const style = document.createElement('style')
style.textContent = `
     :root {
          color-scheme: dark;
          --bg: #13181f;
          --panel: rgba(11, 18, 28, 0.88);
          --panel-strong: rgba(15, 24, 37, 0.98);
          --line: rgba(145, 172, 207, 0.24);
          --text: #edf4ff;
          --muted: #9fb0c9;
          --accent: #7fd0ff;
          --accent-strong: #4fb3ef;
          --danger: #ff5d69;
          --success: #7ce2ab;
          --shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          --radius: 22px;
          font-family: "Segoe UI", "Trebuchet MS", sans-serif;
     }

     * {
          box-sizing: border-box;
     }

     body {
          margin: 0;
          min-height: 100vh;
          color: var(--text);
          background:
               radial-gradient(circle at top left, rgba(65, 132, 188, 0.22), transparent 30%),
               radial-gradient(circle at top right, rgba(199, 76, 93, 0.16), transparent 22%),
               linear-gradient(180deg, #18212d 0%, #0b1119 100%);
     }

     button,
     input,
     select {
          font: inherit;
     }

     .shell {
          width: min(1500px, calc(100vw - 32px));
          margin: 20px auto;
          display: grid;
          gap: 18px;
     }

     .panel {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
     }

     .hero {
          padding: 26px 28px 22px;
          display: grid;
          gap: 16px;
     }

     .hero-top {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
     }

     .title {
          margin: 0;
          font-size: clamp(30px, 5vw, 52px);
          line-height: 0.95;
          letter-spacing: 0.04em;
          text-transform: uppercase;
     }

     .subtitle {
          margin: 10px 0 0;
          max-width: 760px;
          color: var(--muted);
          line-height: 1.5;
     }

     .status {
          min-width: 220px;
          padding: 14px 16px;
          border-radius: 18px;
          background: var(--panel-strong);
          border: 1px solid var(--line);
          display: grid;
          gap: 6px;
     }

     .status-label {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
     }

     .status-value {
          font-size: 16px;
     }

     .toolbar {
          padding: 18px 20px;
          display: grid;
          gap: 14px;
     }

     .toolbar-grid {
          display: grid;
          grid-template-columns: 220px minmax(220px, 1fr) auto auto auto;
          gap: 12px;
          align-items: center;
     }

     .field,
     .search,
     .button {
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: rgba(11, 17, 26, 0.88);
          color: var(--text);
     }

     .field,
     .search {
          width: 100%;
          padding: 0 14px;
     }

     .button {
          padding: 0 18px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
     }

     .button:hover {
          transform: translateY(-1px);
          border-color: rgba(127, 208, 255, 0.6);
     }

     .button-primary {
          background: linear-gradient(135deg, rgba(79, 179, 239, 0.26), rgba(127, 208, 255, 0.16));
          border-color: rgba(127, 208, 255, 0.5);
     }

     .button-ghost {
          background: rgba(12, 18, 27, 0.62);
     }

     .toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          user-select: none;
     }

     .toggle input {
          accent-color: var(--accent-strong);
     }

     .message {
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
     }

     .message-info {
          color: var(--muted);
          background: rgba(127, 208, 255, 0.08);
          border: 1px solid rgba(127, 208, 255, 0.22);
     }

     .message-error {
          color: #ffd9dc;
          background: rgba(255, 93, 105, 0.12);
          border: 1px solid rgba(255, 93, 105, 0.32);
     }

     .tag-cloud,
     .tag-options,
     .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
     }

     .tag-badge,
     .chip,
     .tag-option {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--line);
          display: inline-flex;
          align-items: center;
          gap: 8px;
     }

     .tag-badge {
          background: rgba(127, 208, 255, 0.1);
          border-color: rgba(127, 208, 255, 0.22);
     }

     .chip {
          padding-right: 10px;
          border-color: rgba(124, 226, 171, 0.34);
          background: rgba(124, 226, 171, 0.12);
     }

     .chip-remove,
     .tag-option {
          cursor: pointer;
     }

     .chip-remove {
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: inherit;
     }

     .tag-option {
          color: var(--muted);
          background: transparent;
     }

     .tag-option-active {
          color: var(--text);
          border-color: rgba(127, 208, 255, 0.46);
          background: rgba(127, 208, 255, 0.14);
     }

     .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
     }

     .card {
          overflow: hidden;
     }

     .thumb {
          position: relative;
          aspect-ratio: 16 / 10;
          background: #05080d;
          overflow: hidden;
     }

     .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
     }

     .mobile-warning {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 40px;
          height: 40px;
          padding: 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 93, 105, 0.44);
          background: rgba(255, 93, 105, 0.16);
          color: var(--danger);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24);
     }

     .mobile-warning svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
     }

     .card-body {
          padding: 16px;
          display: grid;
          gap: 14px;
     }

     .path {
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
     }

     .folder,
     .hint,
     .empty {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
     }

     .folder {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 12px;
     }

     .tag-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
     }

     @media (max-width: 960px) {
          .shell {
               width: min(100vw - 20px, 1500px);
               margin: 10px auto 20px;
          }

          .hero-top {
               flex-direction: column;
          }

          .toolbar-grid {
               grid-template-columns: 1fr;
          }
     }
`
document.head.append(style)

const compareText = (left: string, right: string) =>
     left.localeCompare(right, 'ru')

const cloneEntry = (entry: BackgroundAdminEntry): BackgroundAdminEntry => ({
     ...entry,
     tags: [...entry.tags],
})

const getKnownTags = () =>
     [...new Set([...state.tags, ...state.entries.flatMap((entry) => entry.tags)])].sort(
          compareText
     )

const setFeedback = (message: string, isError = false) => {
     if (isError) {
          state.error = message
          state.message = ''
     } else {
          state.message = message
          state.error = ''
     }
}

const createElement = <K extends keyof HTMLElementTagNameMap>(
     tagName: K,
     className?: string,
     text?: string
) => {
     const element = document.createElement(tagName)

     if (className) element.className = className
     if (typeof text == 'string') element.textContent = text

     return element
}

const requestData = async (method = 'GET', body?: object) => {
     const response = await fetch(API_URL, {
          method,
          headers:
               method == 'POST'
                    ? {
                           'Content-Type': 'application/json',
                      }
                    : undefined,
          body: body ? JSON.stringify(body) : undefined,
     })

     const payload = (await response.json()) as BackgroundAdminPayload & {
          error?: string
     }

     if (!response.ok) {
          throw new Error(payload.error || 'Request failed')
     }

     return payload
}

const syncFromPayload = (payload: BackgroundAdminPayload) => {
     state.entries = payload.entries.map(cloneEntry)
     state.folders = payload.folders
     state.tags = payload.tags
}

const render = () => {
     const entries = state.entries.filter((entry) => {
          if (state.folder != 'all' && entry.folder != state.folder) return false
          if (state.onlyMissingMobile && entry.hasMobile) return false

          const needle = state.search.trim().toLowerCase()
          if (!needle) return true

          return `${entry.path} ${entry.tags.join(' ')}`
               .toLowerCase()
               .includes(needle)
     })
     const knownTags = getKnownTags()

     app.replaceChildren()

     const shell = createElement('div', 'shell')
     const hero = createElement('section', 'panel hero')
     const heroTop = createElement('div', 'hero-top')
     const heroText = document.createElement('div')
     heroText.append(
          createElement(
               'h1',
               'title',
               `Background Admin${state.dirty ? ' *' : ''}`
          ),
          createElement(
               'p',
               'subtitle',
               'Dev-only инструмент для тегирования desktop-фонов из /assets/sprites/bg. Чтобы режим собирался в приложении, тег должен совпадать с его именем.'
          )
     )

     const status = createElement('div', 'status')
     status.append(
          createElement('div', 'status-label', 'Состояние'),
          createElement(
               'div',
               'status-value',
               state.loading
                    ? 'Загрузка...'
                    : state.saving
                    ? 'Сохранение...'
                    : state.dirty
                    ? 'Есть изменения'
                    : 'Синхронизировано'
          ),
          createElement(
               'div',
               'status-label',
               `${entries.length} из ${state.entries.length} карточек`
          )
     )
     heroTop.append(heroText, status)
     hero.append(heroTop)

     if (state.error) {
          hero.append(createElement('div', 'message message-error', state.error))
     } else if (state.message) {
          hero.append(createElement('div', 'message message-info', state.message))
     }

     const legend = createElement('div', 'tag-cloud')
     if (knownTags.length == 0) {
          legend.append(createElement('div', 'tag-badge', 'Тегов пока нет'))
     } else {
          for (const tag of knownTags) {
               legend.append(createElement('div', 'tag-badge', tag))
          }
     }
     hero.append(legend)

     const toolbar = createElement('section', 'panel toolbar')
     const controls = createElement('div', 'toolbar-grid')

     const folderSelect = createElement('select', 'field') as HTMLSelectElement
     folderSelect.append(new Option('Все папки', 'all'))
     for (const folder of state.folders) {
          folderSelect.append(new Option(folder, folder))
     }
     folderSelect.value = state.folder
     folderSelect.addEventListener('change', () => {
          state.folder = folderSelect.value
          render()
     })

     const searchInput = createElement('input', 'search') as HTMLInputElement
     searchInput.placeholder = 'Поиск по пути или тегу'
     searchInput.value = state.search
     searchInput.addEventListener('input', () => {
          state.search = searchInput.value
          render()
     })

     const missingToggle = createElement('label', 'toggle')
     const missingCheckbox = document.createElement('input')
     missingCheckbox.type = 'checkbox'
     missingCheckbox.checked = state.onlyMissingMobile
     missingCheckbox.addEventListener('change', () => {
          state.onlyMissingMobile = missingCheckbox.checked
          render()
     })
     missingToggle.append(
          missingCheckbox,
          createElement('span', '', 'Только без mobile')
     )

     const reloadButton = createElement(
          'button',
          'button button-ghost',
          'Перезагрузить'
     )
     reloadButton.type = 'button'
     reloadButton.disabled = state.loading || state.saving
     reloadButton.addEventListener('click', () => {
          void load()
     })

     const saveButton = createElement(
          'button',
          'button button-primary',
          state.saving ? 'Сохранение...' : 'Сохранить manifest'
     )
     saveButton.type = 'button'
     saveButton.disabled = state.loading || state.saving
     saveButton.addEventListener('click', () => {
          void save()
     })

     controls.append(
          folderSelect,
          searchInput,
          missingToggle,
          reloadButton,
          saveButton
     )
     toolbar.append(controls)

     const cards = createElement('section', 'cards')

     if (entries.length == 0) {
          cards.append(
               createElement(
                    'div',
                    'panel hero',
                    'По текущим фильтрам ничего не найдено.'
               )
          )
     } else {
          for (const entry of entries) {
               cards.append(createCard(entry, knownTags))
          }
     }

     shell.append(hero, toolbar, cards)
     app.append(shell)
}

const markDirty = () => {
     state.dirty = true
     setFeedback('Есть несохранённые изменения.')
     render()
}

const updateEntry = (
     path: string,
     updater: (entry: BackgroundAdminEntry) => BackgroundAdminEntry
) => {
     state.entries = state.entries.map((entry) =>
          entry.path == path ? updater(cloneEntry(entry)) : entry
     )
}

const addTag = (path: string, rawTag: string) => {
     const tag = rawTag.trim()
     if (!tag) return

     let changed = false
     updateEntry(path, (entry) => {
          if (entry.tags.includes(tag)) return entry
          entry.tags = [...entry.tags, tag].sort(compareText)
          changed = true
          return entry
     })

     if (!changed) return
     state.tags = getKnownTags()
     markDirty()
}

const removeTag = (path: string, tag: string) => {
     let changed = false
     updateEntry(path, (entry) => {
          if (!entry.tags.includes(tag)) return entry
          entry.tags = entry.tags.filter((value) => value != tag)
          changed = true
          return entry
     })

     if (!changed) return
     state.tags = getKnownTags()
     markDirty()
}

const toggleTag = (path: string, tag: string) => {
     const entry = state.entries.find((value) => value.path == path)
     if (!entry) return

     if (entry.tags.includes(tag)) {
          removeTag(path, tag)
     } else {
          addTag(path, tag)
     }
}

const createCard = (entry: BackgroundAdminEntry, knownTags: string[]) => {
     const card = createElement('article', 'panel card')
     const thumb = createElement('div', 'thumb')
     const image = document.createElement('img')
     image.src = entry.path
     image.alt = entry.path
     thumb.append(image)

     if (!entry.hasMobile) {
          const warning = createElement('div', 'mobile-warning')
          warning.title =
               'smartphone-charging: для этого desktop-файла не найден mobile-дубликат'
          warning.innerHTML = phoneIcon
          thumb.append(warning)
     }

     const body = createElement('div', 'card-body')
     body.append(createElement('div', 'folder', entry.folder))
     body.append(createElement('div', 'path', entry.path))

     const chips = createElement('div', 'chips')
     if (entry.tags.length == 0) {
          chips.append(createElement('div', 'empty', 'Без тегов'))
     } else {
          for (const tag of entry.tags) {
               const chip = createElement('div', 'chip')
               chip.append(createElement('span', '', tag))

               const removeButton = createElement('button', 'chip-remove', '×')
               removeButton.type = 'button'
               removeButton.addEventListener('click', () => removeTag(entry.path, tag))
               chip.append(removeButton)
               chips.append(chip)
          }
     }
     body.append(chips)

     const options = createElement('div', 'tag-options')
     for (const tag of knownTags) {
          const option = createElement(
               'button',
               `tag-option${entry.tags.includes(tag) ? ' tag-option-active' : ''}`,
               tag
          )
          option.type = 'button'
          option.addEventListener('click', () => toggleTag(entry.path, tag))
          options.append(option)
     }
     body.append(options)

     const form = createElement('form', 'tag-form')
     const input = createElement('input', 'field') as HTMLInputElement
     input.placeholder = 'Новый тег'

     const submit = createElement('button', 'button button-ghost', 'Добавить')
     submit.type = 'submit'

     form.addEventListener('submit', (event) => {
          event.preventDefault()
          addTag(entry.path, input.value)
          input.value = ''
     })

     form.append(input, submit)
     body.append(form)
     body.append(
          createElement(
               'div',
               'hint',
               entry.hasMobile
                    ? `Mobile: ${entry.mobilePath}`
                    : 'Mobile fallback: в рантайме будет использован desktop-файл.'
          )
     )

     card.append(thumb, body)
     return card
}

const load = async () => {
     state.loading = true
     render()

     try {
          const payload = await requestData()
          syncFromPayload(payload)
          state.dirty = false
          setFeedback('Manifest загружен.')
     } catch (error) {
          setFeedback(
               error instanceof Error ? error.message : 'Не удалось загрузить manifest',
               true
          )
     } finally {
          state.loading = false
          render()
     }
}

const save = async () => {
     state.saving = true
     render()

     try {
          const payload = await requestData('POST', {
               entries: state.entries.map((entry) => ({
                    path: entry.path,
                    tags: entry.tags,
               })),
          })
          syncFromPayload(payload)
          state.dirty = false
          setFeedback('Manifest сохранён.')
     } catch (error) {
          setFeedback(
               error instanceof Error ? error.message : 'Не удалось сохранить manifest',
               true
          )
     } finally {
          state.saving = false
          render()
     }
}

window.addEventListener('beforeunload', (event) => {
     if (!state.dirty) return
     event.preventDefault()
})

void load()
