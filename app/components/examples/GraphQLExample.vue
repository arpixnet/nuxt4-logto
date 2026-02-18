<script setup lang="ts">
/**
 * GraphQL Client Usage Examples
 *
 * This component demonstrates how to use the secure GraphQL client
 * with Hasura and Logto authentication.
 *
 * Security features:
 * - Tokens are stored ONLY in memory (never cookies/localStorage)
 * - Automatic token refresh before expiration
 * - Token cleared on logout
 *
 * User data comes from Logto, not from Hasura.
 * Hasura only stores application data (posts) with author_id reference.
 */

const { query, mutate, useQuery, useSubscription, clearToken } = useGraphQLClient()
const { isAuthenticated, session } = useAuthSession()
const clientLogger = useClientLogger()

// ==========================================
// Types (matches Hasura schema)
// ==========================================
interface Post {
  id: string
  title: string
  content: string
  author_id: string
  created_at: string
}

// ==========================================
// 1. Reactive Query (auto-fetching)
// ==========================================
const postsQuery = useQuery<{ posts: Post[] }>(`
  query GetPosts {
    posts(order_by: { created_at: desc }, limit: 10) {
      id
      title
      content
      author_id
      created_at
    }
  }
`)

// Helper to check if current user is the author
function isAuthor(authorId: string): boolean {
  return session.value?.user?.sub === authorId
}

// Helper to get author display name
function getAuthorName(authorId: string): string {
  if (isAuthor(authorId)) {
    return session.value?.user?.name || 'You'
  }
  return `User ${authorId.slice(0, 8)}...`
}

// ==========================================
// 2. Manual Query with Variables
// ==========================================
const searchQuery = ref('')
const searchResults = ref<Post[]>([])
const searchLoading = ref(false)

async function searchPosts() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  try {
    const data = await query<{ posts: Post[] }>(`
      query SearchPosts($search: String!) {
        posts(where: {
          _or: [
            { title: { _ilike: $search } },
            { content: { _ilike: $search } }
          ]
        }, order_by: { created_at: desc }) {
          id
          title
          content
          author_id
          created_at
        }
      }
    `, { search: `%${searchQuery.value}%` })

    searchResults.value = data.posts || []
  } catch (error) {
    clientLogger.error('graphql-example', 'Search failed', error)
  } finally {
    searchLoading.value = false
  }
}

// ==========================================
// 3. Create / Edit Post
// ==========================================
const newPostTitle = ref('')
const newPostContent = ref('')
const creating = ref(false)
const editingPost = ref<Post | null>(null)
const showForm = ref(false)

function openCreateForm() {
  editingPost.value = null
  newPostTitle.value = ''
  newPostContent.value = ''
  showForm.value = true
}

function openEditForm(post: Post) {
  editingPost.value = post
  newPostTitle.value = post.title
  newPostContent.value = post.content || ''
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingPost.value = null
  newPostTitle.value = ''
  newPostContent.value = ''
}

async function savePost() {
  if (!newPostTitle.value.trim()) return

  creating.value = true
  try {
    if (editingPost.value) {
      // Update existing post
      await mutate(`
        mutation UpdatePost($id: uuid!, $title: String!, $content: String!) {
          update_posts_by_pk(pk_columns: { id: $id }, _set: {
            title: $title,
            content: $content
          }) {
            id
            title
          }
        }
      `, {
        id: editingPost.value.id,
        title: newPostTitle.value,
        content: newPostContent.value
      })
    } else {
      // Create new post
      await mutate(`
        mutation CreatePost($title: String!, $content: String!) {
          insert_posts_one(object: {
            title: $title,
            content: $content
          }) {
            id
            title
          }
        }
      `, {
        title: newPostTitle.value,
        content: newPostContent.value
      })
    }

    // Reset form
    cancelForm()

    // Refetch posts
    postsQuery.refetch()
  } catch (error) {
    clientLogger.error('graphql-example', 'Save post failed', error)
  } finally {
    creating.value = false
  }
}

// ==========================================
// 4. Delete Post
// ==========================================
const deleting = ref<string | null>(null)

async function deletePost(post: Post) {
  if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
    return
  }

  deleting.value = post.id
  try {
    await mutate(`
      mutation DeletePost($id: uuid!) {
        delete_posts_by_pk(id: $id) {
          id
        }
      }
    `, { id: post.id })

    // Refetch posts
    postsQuery.refetch()
  } catch (error) {
    clientLogger.error('graphql-example', 'Delete post failed', error)
  } finally {
    deleting.value = null
  }
}

// ==========================================
// 5. Subscription Example (real-time updates)
// ==========================================
const livePostCount = ref(0)

const postSubscription = useSubscription<{ posts: Post[] }>(`
  subscription OnPostsChange {
    posts(order_by: { created_at: desc }, limit: 10) {
      id
      title
      author_id
      created_at
    }
  }
`)

// Watch subscription data to count posts
watch(() => postSubscription.data.value, (newData) => {
  if (newData?.posts) {
    livePostCount.value = newData.posts.length
  }
}, { immediate: true })

// ==========================================
// 6. Clear Token (on manual logout)
// ==========================================
function handleClearToken() {
  clearToken()
}
</script>

<template>
  <div class="space-y-8 p-6">
    <!-- Authentication Status -->
    <div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
      <p class="text-sm">
        Status:
        <span
          v-if="isAuthenticated"
          class="font-medium text-green-600"
        >
          Authenticated
        </span>
        <span
          v-else
          class="font-medium text-red-600"
        >
          Not Authenticated
        </span>
        <span
          v-if="session?.user"
          class="ml-2 text-gray-500"
        >
          ({{ session.user.name || session.user.email }})
        </span>
      </p>
    </div>

    <!-- 1. Reactive Query Example -->
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          1. Posts
        </h2>
        <UButton
          v-if="!showForm"
          size="sm"
          @click="openCreateForm"
        >
          New Post
        </UButton>
      </div>

      <div
        v-if="postsQuery.loading.value"
        class="text-gray-500"
      >
        Loading posts...
      </div>

      <div
        v-else-if="postsQuery.error.value"
        class="text-red-500"
      >
        Error: {{ postsQuery.error.value.message }}
      </div>

      <div v-else>
        <!-- Post Form (Create/Edit) -->
        <div
          v-if="showForm"
          class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
        >
          <h3 class="mb-3 font-medium">
            {{ editingPost ? 'Edit Post' : 'Create New Post' }}
          </h3>

          <div class="grid gap-3">
            <UInput
              v-model="newPostTitle"
              placeholder="Post title..."
              size="lg"
            />
            <UTextarea
              v-model="newPostContent"
              placeholder="Post content (optional)..."
              :rows="4"
            />
            <div class="flex gap-2">
              <UButton
                :loading="creating"
                :disabled="!newPostTitle.trim()"
                @click="savePost"
              >
                {{ editingPost ? 'Update' : 'Create' }}
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                @click="cancelForm"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </div>

        <!-- Posts List -->
        <p
          v-if="postsQuery.data.value?.posts?.length"
          class="mb-3 text-sm text-gray-500"
        >
          {{ postsQuery.data.value.posts.length }} posts
        </p>

        <ul
          v-if="postsQuery.data.value?.posts?.length"
          class="space-y-3"
        >
          <li
            v-for="post in postsQuery.data.value.posts"
            :key="post.id"
            class="rounded-lg border p-4 transition-shadow hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-medium">
                  {{ post.title }}
                </h3>
                <p
                  v-if="post.content"
                  class="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ post.content.slice(0, 150) }}{{ post.content.length > 150 ? '...' : '' }}
                </p>
                <p class="mt-2 text-xs text-gray-400">
                  by {{ getAuthorName(post.author_id) }}
                  <span
                    v-if="isAuthor(post.author_id)"
                    class="ml-1 font-medium text-green-600"
                  >
                    (you)
                  </span>
                  <span class="mx-1">·</span>
                  {{ new Date(post.created_at).toLocaleDateString() }}
                </p>
              </div>

              <!-- Action Buttons (only for author) -->
              <div
                v-if="isAuthor(post.author_id)"
                class="flex shrink-0 gap-1"
              >
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="openEditForm(post)"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :loading="deleting === post.id"
                  @click="deletePost(post)"
                />
              </div>
            </div>
          </li>
        </ul>

        <p
          v-else
          class="rounded-lg border-2 border-dashed p-8 text-center text-gray-400"
        >
          No posts yet. Click "New Post" to create one!
        </p>

        <UButton
          v-if="postsQuery.data.value?.posts?.length"
          size="xs"
          color="neutral"
          variant="ghost"
          class="mt-3"
          @click="postsQuery.refetch"
        >
          Refresh
        </UButton>
      </div>
    </section>

    <!-- 2. Manual Query with Variables -->
    <section>
      <h2 class="mb-4 text-lg font-semibold">
        2. Search Posts
      </h2>

      <div class="flex gap-2">
        <UInput
          v-model="searchQuery"
          placeholder="Search in posts..."
          class="flex-1"
          @keyup.enter="searchPosts"
        />
        <UButton
          :loading="searchLoading"
          @click="searchPosts"
        >
          Search
        </UButton>
      </div>

      <ul
        v-if="searchResults.length"
        class="mt-4 space-y-2"
      >
        <li
          v-for="post in searchResults"
          :key="post.id"
          class="rounded border p-3"
        >
          <span class="font-medium">{{ post.title }}</span>
          <span class="ml-2 text-xs text-gray-400">
            by {{ getAuthorName(post.author_id) }}
          </span>
        </li>
      </ul>
    </section>

    <!-- 3. Subscription Example -->
    <section>
      <h2 class="mb-4 text-lg font-semibold">
        3. Real-time Posts (Subscription)
      </h2>

      <div class="flex items-center gap-4">
        <div class="rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
          <span class="text-2xl font-bold">{{ livePostCount }}</span>
          <span class="ml-2 text-sm">posts monitored</span>
        </div>

        <div class="text-sm">
          <p>
            Status:
            <span
              v-if="postSubscription.isActive.value"
              class="text-green-600"
            >
              Live
            </span>
            <span
              v-else
              class="text-gray-500"
            >
              Inactive
            </span>
          </p>
          <UButton
            v-if="postSubscription.isActive.value"
            size="xs"
            color="error"
            @click="postSubscription.stop"
          >
            Stop
          </UButton>
          <UButton
            v-else
            size="xs"
            @click="postSubscription.start"
          >
            Start
          </UButton>
        </div>
      </div>

      <p
        v-if="postSubscription.error.value"
        class="mt-2 text-sm text-red-500"
      >
        Subscription error: {{ postSubscription.error.value }}
      </p>
    </section>

    <!-- 4. Manual Token Clear -->
    <section>
      <h2 class="mb-4 text-lg font-semibold">
        4. Manual Token Clear
      </h2>

      <p class="mb-2 text-sm text-gray-500">
        Clears the token from memory (useful for debugging)
      </p>

      <UButton
        size="sm"
        color="error"
        variant="outline"
        @click="handleClearToken"
      >
        Clear Token
      </UButton>
    </section>
  </div>
</template>
