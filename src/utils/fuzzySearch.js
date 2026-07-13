export const normalizeExerciseName = (value = '') => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')

const levenshteinDistance = (left, right) => {
  if (!left.length) return right.length
  if (!right.length) return left.length
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]
    previous[0] = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
      diagonal = above
    }
  }
  return previous[right.length]
}

const bigrams = (value) => {
  if (value.length < 2) return value ? [value] : []
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2))
}

export const fuzzyScore = (query, candidate) => {
  const normalizedQuery = normalizeExerciseName(query)
  const normalizedCandidate = normalizeExerciseName(candidate)
  if (!normalizedQuery) return 1
  if (!normalizedCandidate) return 0
  if (normalizedQuery === normalizedCandidate) return 1
  if (normalizedCandidate.includes(normalizedQuery)) return 0.94 - Math.min(0.16, (normalizedCandidate.length - normalizedQuery.length) / 100)

  const queryTokens = normalizedQuery.split(' ')
  const candidateTokens = normalizedCandidate.split(' ')
  const tokenScore = queryTokens.reduce((total, token) => {
    const best = Math.max(...candidateTokens.map((candidateToken) => {
      if (candidateToken.startsWith(token) || token.startsWith(candidateToken)) return 0.9
      return 1 - levenshteinDistance(token, candidateToken) / Math.max(token.length, candidateToken.length)
    }))
    return total + Math.max(0, best)
  }, 0) / queryTokens.length

  const queryPairs = bigrams(normalizedQuery)
  const candidatePairs = bigrams(normalizedCandidate)
  const availablePairs = [...candidatePairs]
  let overlap = 0
  queryPairs.forEach((pair) => {
    const matchIndex = availablePairs.indexOf(pair)
    if (matchIndex >= 0) {
      overlap += 1
      availablePairs.splice(matchIndex, 1)
    }
  })
  const diceScore = queryPairs.length + candidatePairs.length ? (2 * overlap) / (queryPairs.length + candidatePairs.length) : 0
  const editScore = 1 - levenshteinDistance(normalizedQuery, normalizedCandidate) / Math.max(normalizedQuery.length, normalizedCandidate.length)

  return Math.max(0, tokenScore * 0.5 + diceScore * 0.3 + editScore * 0.2)
}

export const fuzzySearch = (items, query, selector = (item) => item.name, threshold = 0.32) => {
  if (!normalizeExerciseName(query)) return [...items]
  return items
    .map((item) => ({ item, score: fuzzyScore(query, selector(item)) }))
    .filter(({ score }) => score >= threshold)
    .sort((left, right) => right.score - left.score || selector(left.item).localeCompare(selector(right.item)))
    .map(({ item }) => item)
}

export const findSimilarExercises = (items, name, limit = 5) => {
  if (normalizeExerciseName(name).length < 3) return []
  return items
    .map((item) => ({ item, score: fuzzyScore(name, item.name) }))
    .filter(({ score }) => score >= 0.52)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
    .slice(0, limit)
}
