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

type DomRefs = {
     statusValue: HTMLDivElement
     feedback: HTMLDivElement
     tagFilters: HTMLDivElement
     folderSelect: HTMLSelectElement
     searchInput: HTMLInputElement
     missingCheckbox: HTMLInputElement
     reloadButton: HTMLButtonElement
     saveButton: HTMLButtonElement
     cards: HTMLElement
}

const API_URL = '/__bg-admin/api/manifest'

const state = {
     entries: [] as BackgroundAdminEntry[],
     folders: [] as string[],
     tags: [] as string[],
     folder: 'all',
     search: '',
     selectedTags: [] as string[],
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
          --bg: #10151c;
          --panel: rgba(16, 22, 31, 0.96);
          --panel-soft: rgba(20, 28, 38, 0.96);
          --panel-strong: rgba(9, 14, 21, 0.98);
          --text: #edf4ff;
          --muted: #98a8be;
          --accent: #7fd0ff;
          --accent-soft: rgba(127, 208, 255, 0.16);
          --accent-strong: #4fb3ef;
          --danger: #ff7480;
          --danger-soft: rgba(255, 116, 128, 0.14);
          --success-soft: rgba(124, 226, 171, 0.14);
          --shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
          --radius-lg: 10px;
          --radius-md: 8px;
          --radius-sm: 6px;
          font-family: "Segoe UI", "Trebuchet MS", sans-serif;
     }

     * {
          box-sizing: border-box;
     }

     body {
          margin: 0;
          min-height: 100vh;
          color: var(--text);
          background: var(--bg);
     }

     button,
     input,
     select {
          font: inherit;
          border: 0;
          outline: none;
     }

     button {
          border: 0;
     }

     .shell {
          width: calc(100vw - 140px);
          margin: 14px auto;
          display: grid;
          gap: 12px;
     }

     .panel {
          background: var(--panel);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow);
     }

     .hero {
          padding: 14px;
          display: grid;
          gap: 10px;
     }

     .hero-top {
          display: grid;
          gap: 10px;
     }

     .status {
          padding: 10px 12px;
          border-radius: var(--radius-md);
          background: rgba(127, 208, 255, 0.08);
     }

     .status-label,
     .folder,
     .empty {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
     }

     .status-label,
     .folder {
          text-transform: uppercase;
          letter-spacing: 0.08em;
     }

     .status-value {
          font-size: 13px;
          color: var(--muted);
     }

     .toolbar {
          padding: 14px;
          display: grid;
          gap: 12px;
     }

     .toolbar-grid {
          display: grid;
          grid-template-columns: 220px minmax(220px, 1fr) auto auto auto;
          gap: 10px;
          align-items: center;
     }

     .field,
     .search,
     .button,
     .tag-filter,
     .tag-option {
          min-height: 40px;
          border-radius: var(--radius-md);
          color: var(--text);
     }

     .field,
     .search {
          width: 100%;
          padding: 0 12px;
          background: var(--panel-strong);
     }

     .field::placeholder,
     .search::placeholder {
          color: var(--muted);
     }

     .button {
          padding: 0 16px;
          cursor: pointer;
          background: var(--panel-soft);
          transition: background 120ms ease, transform 120ms ease;
     }

     .button:hover,
     .tag-filter:hover,
     .tag-option:hover {
          transform: translateY(-1px);
     }

     .button-primary {
          background: var(--accent-soft);
          color: #dff4ff;
     }

     .button-primary:hover {
          background: rgba(127, 208, 255, 0.24);
     }

     .button-ghost {
          background: var(--panel-strong);
     }

     .toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          user-select: none;
          min-height: 40px;
          padding: 0 2px;
     }

     .toggle input {
          accent-color: var(--accent-strong);
     }

     .message {
          min-height: 39px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
     }

     .message-info {
          color: var(--muted);
          background: rgba(127, 208, 255, 0.08);
     }

     .message-error {
          color: #ffd9dc;
          background: var(--danger-soft);
     }

     .message-empty {
          background: rgba(127, 208, 255, 0.08);
          color: transparent;
     }

     .tag-cloud,
     .tag-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
     }

     .tag-filter,
     .tag-option,
     .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: var(--panel-soft);
     }

     .tag-filter,
     .tag-option {
          cursor: pointer;
     }

     .tag-filter {
          color: var(--muted);
     }

     .tag-filter-active,
     .tag-option-active {
          color: var(--text);
          background: rgba(79, 179, 239, 0.34);
          box-shadow: inset 0 0 0 1px rgba(127, 208, 255, 0.22);
     }

     .tag-badge {
          min-height: 32px;
          border-radius: var(--radius-sm);
          color: var(--muted);
     }

     .cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, 300px);
          gap: 14px;
          justify-content: start;
     }

     .card {
          overflow: hidden;
          width: 300px;
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
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          color: var(--danger);
     }

     .mobile-warning svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
     }

     .card-body {
          padding: 14px;
          display: grid;
          gap: 10px;
     }

     .path-row {
          display: flex;
          align-items: center;
          gap: 8px;
     }

     .path {
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
     }

     @media (max-width: 960px) {
          .shell {
               width: min(100vw - 18px, 1500px);
               margin: 10px auto 18px;
          }

          .hero-top {
               flex-direction: column;
               align-items: stretch;
          }

          .toolbar-grid {
               grid-template-columns: 1fr;
          }

          .cards {
               justify-content: center;
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

const dom = {} as DomRefs

const syncSelectedTags = (knownTags = getKnownTags()) => {
     const knownTagSet = new Set(knownTags)
     state.selectedTags = state.selectedTags.filter((tag) => knownTagSet.has(tag))
}

const getFilteredEntries = () => {
     const needle = state.search.trim().toLowerCase()
     const selectedTagSet = new Set(state.selectedTags)

     return state.entries.filter((entry) => {
          if (state.folder != 'all' && entry.folder != state.folder) return false
          if (state.onlyMissingMobile && entry.hasMobile) return false

          if (
               selectedTagSet.size > 0 &&
               !entry.tags.some((tag) => selectedTagSet.has(tag))
          ) {
               return false
          }

          if (!needle) return true

          return `${entry.path} ${entry.tags.join(' ')}`
               .toLowerCase()
               .includes(needle)
     })
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

     if (state.folder != 'all' && !state.folders.includes(state.folder)) {
          state.folder = 'all'
     }

     syncSelectedTags()
}

const updateFolderOptions = () => {
     const currentOptions = Array.from(dom.folderSelect.options).map(
          (option) => option.value
     )
     const nextOptions = ['all', ...state.folders]

     const sameOptions =
          currentOptions.length == nextOptions.length &&
          currentOptions.every((value, index) => value == nextOptions[index])

     if (!sameOptions) {
          dom.folderSelect.replaceChildren()
          dom.folderSelect.append(new Option('Все папки', 'all'))

          for (const folder of state.folders) {
               dom.folderSelect.append(new Option(folder, folder))
          }
     }

     dom.folderSelect.value = state.folder
}

const toggleSelectedTag = (tag: string) => {
     if (state.selectedTags.includes(tag)) {
          state.selectedTags = state.selectedTags.filter((value) => value != tag)
     } else {
          state.selectedTags = [...state.selectedTags, tag].sort(compareText)
     }

     updateView()
}

const createCard = (entry: BackgroundAdminEntry, knownTags: string[]) => {
     const card = createElement('article', 'panel card')
     const thumb = createElement('div', 'thumb')
     const image = document.createElement('img')
     image.src = entry.path
     image.alt = entry.path
     thumb.append(image)

     const body = createElement('div', 'card-body')
     body.append(createElement('div', 'folder', entry.folder))
     const pathRow = createElement('div', 'path-row')
     pathRow.append(createElement('div', 'path', entry.path))
     if (!entry.hasMobile) {
          const warning = createElement('div', 'mobile-warning')
          warning.title =
               'smartphone-charging: для этого desktop-файла не найден mobile-дубликат'
          warning.innerHTML = phoneIcon
          pathRow.append(warning)
     }
     body.append(pathRow)

     const options = createElement('div', 'tag-options')
     for (const tag of knownTags) {
          const option = createElement(
               'button',
               `tag-option${entry.tags.includes(tag) ? ' tag-option-active' : ''}`,
               tag
          ) as HTMLButtonElement
          option.type = 'button'
          option.addEventListener('click', () => toggleTag(entry.path, tag))
          options.append(option)
     }
     body.append(options)

     card.append(thumb, body)
     return card
}

const renderCards = (entries: BackgroundAdminEntry[], knownTags: string[]) => {
     dom.cards.replaceChildren()

     if (entries.length == 0) {
          dom.cards.append(
               createElement(
                    'div',
                    'panel hero',
                    'По текущим фильтрам ничего не найдено.'
               )
          )
          return
     }

     for (const entry of entries) {
          dom.cards.append(createCard(entry, knownTags))
     }
}

const updateView = () => {
     const knownTags = getKnownTags()
     syncSelectedTags(knownTags)
     const entries = getFilteredEntries()

     const statusText = state.loading
          ? 'Загрузка...'
          : state.saving
          ? 'Сохранение...'
          : state.dirty
          ? 'Есть изменения'
          : 'Синхронизировано'
     dom.statusValue.textContent = `${statusText} ${entries.length} из ${state.entries.length} карточек`

     dom.feedback.replaceChildren()
     if (state.error) {
          dom.feedback.append(
               createElement('div', 'message message-error', state.error)
          )
     } else if (state.message) {
          dom.feedback.append(
               createElement('div', 'message message-info', state.message)
          )
     } else {
          dom.feedback.append(createElement('div', 'message message-empty', '.'))
     }

     dom.tagFilters.replaceChildren()
     if (knownTags.length == 0) {
          dom.tagFilters.append(createElement('div', 'tag-badge', 'Тегов пока нет'))
     } else {
          for (const tag of knownTags) {
               const button = createElement(
                    'button',
                    `tag-filter${state.selectedTags.includes(tag) ? ' tag-filter-active' : ''}`,
                    tag
               ) as HTMLButtonElement
               button.type = 'button'
               button.addEventListener('click', () => toggleSelectedTag(tag))
               dom.tagFilters.append(button)
          }
     }

     updateFolderOptions()
     dom.missingCheckbox.checked = state.onlyMissingMobile
     dom.reloadButton.disabled = state.loading || state.saving
     dom.saveButton.disabled = state.loading || state.saving
     dom.saveButton.textContent = state.saving
          ? 'Сохранение...'
          : 'Сохранить manifest'

     renderCards(entries, knownTags)
}

const setupLayout = () => {
     const shell = createElement('div', 'shell')

     const hero = createElement('section', 'panel hero')
     const heroTop = createElement('div', 'hero-top')
     const status = createElement('div', 'status')
     const statusValue = createElement('div', 'status-value')
     status.append(statusValue)
     heroTop.append(status)

     const feedback = createElement('div')
     const tagFilters = createElement('div', 'tag-cloud')

     hero.append(heroTop, feedback, tagFilters)

     const toolbar = createElement('section', 'panel toolbar')
     const controls = createElement('div', 'toolbar-grid')

     const folderSelect = createElement('select', 'field') as HTMLSelectElement
     folderSelect.addEventListener('change', () => {
          state.folder = folderSelect.value
          updateView()
     })

     const searchInput = createElement('input', 'search') as HTMLInputElement
     searchInput.placeholder = 'Поиск по пути или тегу'
     searchInput.value = state.search
     searchInput.addEventListener('input', () => {
          state.search = searchInput.value
          updateView()
     })

     const missingToggle = createElement('label', 'toggle')
     const missingCheckbox = document.createElement('input')
     missingCheckbox.type = 'checkbox'
     missingCheckbox.checked = state.onlyMissingMobile
     missingCheckbox.addEventListener('change', () => {
          state.onlyMissingMobile = missingCheckbox.checked
          updateView()
     })
     missingToggle.append(
          missingCheckbox,
          createElement('span', '', 'Только без mobile')
     )

     const reloadButton = createElement(
          'button',
          'button button-ghost',
          'Перезагрузить'
     ) as HTMLButtonElement
     reloadButton.type = 'button'
     reloadButton.addEventListener('click', () => {
          void load()
     })

     const saveButton = createElement(
          'button',
          'button button-primary',
          'Сохранить manifest'
     ) as HTMLButtonElement
     saveButton.type = 'button'
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

     shell.append(hero, toolbar, cards)
     app.replaceChildren(shell)

     dom.statusValue = statusValue
     dom.feedback = feedback
     dom.tagFilters = tagFilters
     dom.folderSelect = folderSelect
     dom.searchInput = searchInput
     dom.missingCheckbox = missingCheckbox
     dom.reloadButton = reloadButton
     dom.saveButton = saveButton
     dom.cards = cards
}

const markDirty = () => {
     state.dirty = true
     setFeedback('')
     updateView()
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
     syncSelectedTags()
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

const load = async () => {
     state.loading = true
     updateView()

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
          updateView()
     }
}

const save = async () => {
     state.saving = true
     updateView()

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
          updateView()
     }
}

setupLayout()
updateView()
void load()

window.addEventListener('beforeunload', (event) => {
     if (!state.dirty) return
     event.preventDefault()
})
