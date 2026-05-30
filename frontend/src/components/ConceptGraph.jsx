import React, { useRef, useEffect } from 'react'
import * as d3 from 'd3'

export default function ConceptGraph({ graph, userModel, onNodeSelect, topic }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return

    const container = svgRef.current?.parentElement
    const width = container?.clientWidth || 600
    const height = 400

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      
    svg.selectAll('*').remove()

    // 1. Create the virtual root node representing the main topic
    const rootNode = {
      id: 'root-topic-center',
      label: topic,
      description: `Overall topic: ${topic}`,
      isRootTopic: true,
      x: width / 2,
      y: height / 2,
      fx: width / 2,
      fy: height / 2
    }

    // 2. Identify the Category nodes (Level 1)
    const inDegrees = {}
    const outDegrees = {}
    graph.nodes.forEach(n => {
      inDegrees[n.id] = 0
      outDegrees[n.id] = 0
    })
    
    ;(graph.edges || []).forEach(e => {
      if (inDegrees[e.to] !== undefined) inDegrees[e.to]++
      if (outDegrees[e.from] !== undefined) outDegrees[e.from]++
    })

    const sortedCandidates = [...graph.nodes].sort((a, b) => {
      const scoreA = (outDegrees[a.id] || 0) - (inDegrees[a.id] || 0) * 2
      const scoreB = (outDegrees[b.id] || 0) - (inDegrees[b.id] || 0) * 2
      return scoreB - scoreA
    })

    const categoryIds = sortedCandidates.slice(0, 4).map(n => n.id)

    const leafNodes = graph.nodes.filter(n => !categoryIds.includes(n.id))
    const parentMap = {}
    const leafGroups = {}
    categoryIds.forEach(id => { leafGroups[id] = [] })

    leafNodes.forEach(leaf => {
      let bestCategory = null
      categoryIds.forEach(catId => {
        const directLink = (graph.edges || []).some(e => e.from === catId && e.to === leaf.id)
        if (directLink) {
          bestCategory = catId
        }
      })

      if (!bestCategory) {
        const incomingEdges = (graph.edges || []).filter(e => e.to === leaf.id)
        if (incomingEdges.length > 0) {
          const parentId = incomingEdges[0].from
          if (categoryIds.includes(parentId)) {
            bestCategory = parentId
          }
        }
      }

      parentMap[leaf.id] = bestCategory
    })

    leafNodes.forEach(leaf => {
      if (!parentMap[leaf.id]) {
        let minCat = categoryIds[0]
        let minCount = Infinity
        categoryIds.forEach(catId => {
          if (leafGroups[catId].length < minCount) {
            minCount = leafGroups[catId].length
            minCat = catId
          }
        })
        parentMap[leaf.id] = minCat
      }
      leafGroups[parentMap[leaf.id]].push(leaf.id)
    })

    const nodes = [
      rootNode,
      ...graph.nodes.map(n => ({
        ...n,
        isRootTopic: false,
        isCategory: categoryIds.includes(n.id)
      }))
    ]

    const links = []
    categoryIds.forEach(catId => {
      links.push({
        source: 'root-topic-center',
        target: catId,
        isRootLink: true
      })
    })

    leafNodes.forEach(leaf => {
      const catId = parentMap[leaf.id]
      if (catId) {
        links.push({
          source: catId,
          target: leaf.id,
          isLeafLink: true
        })
      }
    })

    function assignTargetPositions(nodesList, currentWidth) {
      nodesList.forEach(n => {
        if (n.isRootTopic) {
          n.targetX = currentWidth / 2
          n.targetY = height / 2
          n.fx = currentWidth / 2
          n.fy = height / 2
        } else if (n.isCategory) {
          const idx = categoryIds.indexOf(n.id)
          const angles = [-Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4]
          const radius = 110
          n.targetX = currentWidth / 2 + Math.cos(angles[idx]) * radius
          n.targetY = height / 2 + Math.sin(angles[idx]) * radius
        } else {
          const catId = parentMap[n.id]
          const idx = categoryIds.indexOf(catId)
          const angles = [-Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI / 4]
          
          const leafIndex = leafGroups[catId].indexOf(n.id)
          const leafCount = leafGroups[catId].length
          const baseAngle = angles[idx]
          
          const spread = Math.PI / 3
          const angleOffset = leafCount > 1 
            ? (leafIndex / (leafCount - 1) - 0.5) * spread
            : 0
            
          const leafAngle = baseAngle + angleOffset
          const radius = 200
          n.targetX = currentWidth / 2 + Math.cos(leafAngle) * radius
          n.targetY = height / 2 + Math.sin(leafAngle) * radius
        }
      })
    }

    assignTargetPositions(nodes, width)

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.isRootLink ? 110 : 80).strength(0.8))
      .force('charge', d3.forceManyBody().strength(d => d.isRootTopic ? -350 : d.isCategory ? -120 : -50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.isRootTopic ? 40 : d.isCategory ? 26 : 18))
      .force('x', d3.forceX(d => d.targetX).strength(d => d.isRootTopic ? 1.5 : d.isCategory ? 0.7 : 0.4))
      .force('y', d3.forceY(d => d.targetY).strength(d => d.isRootTopic ? 1.5 : d.isCategory ? 0.7 : 0.4))

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.isRootLink ? '#8b5cf6' : '#475569')
      .attr('stroke-opacity', d => d.isRootLink ? 0.9 : 0.6)
      .attr('stroke-width', d => d.isRootLink ? 3.5 : 1.5)
      .attr('stroke-dasharray', d => d.isLeafLink ? '3,3' : null)

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => d.isRootTopic ? 'cursor-default' : 'cursor-pointer')
      .on('click', (event, d) => {
        if (d.isRootTopic) return
        const origNode = graph.nodes.find(n => n.id === d.id)
        if (origNode) {
          onNodeSelect(origNode)
        }
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    node.append('circle')
      .attr('r', d => d.isRootTopic ? 32 : d.isCategory ? 22 : 15)
      .attr('fill', d => d.isRootTopic ? '#0f172a' : '#090d16')
      .attr('stroke', d => {
        if (d.isRootTopic) return '#8b5cf6'
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Unexplored concept'
        if (!isExplored) return '#ef4444'
        if (score >= 0.7) return '#10b981'
        if (score >= 0.4) return '#8b5cf6'
        return '#f59e0b'
      })
      .attr('stroke-width', d => d.isRootTopic ? 4 : d.isCategory ? 3 : 2)
      .attr('class', d => {
        if (d.isRootTopic) return ''
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Unexplored concept'
        if (!isExplored || score < 0.4) {
          return 'animate-pulse'
        }
        return ''
      })
      .style('filter', d => {
        if (d.isRootTopic) return 'drop-shadow(0 0 10px rgba(139,92,246,0.6))'
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Unexplored concept'
        if (!isExplored) return 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
        if (score >= 0.7) return 'drop-shadow(0 0 6px rgba(16,185,129,0.5))'
        if (score >= 0.4) return 'drop-shadow(0 0 6px rgba(139,92,246,0.5))'
        return 'drop-shadow(0 0 6px rgba(245,158,11,0.5))'
      })

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', '#dae2fd')
      .attr('font-size', d => d.isRootTopic ? '11px' : d.isCategory ? '10px' : '9px')
      .attr('font-weight', 'black')
      .text(d => d.label.slice(0, 3).toUpperCase())

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.isRootTopic ? '3.8em' : d.isCategory ? '3.5em' : '2.8em')
      .attr('fill', d => d.isRootTopic ? '#e2e8f0' : d.isCategory ? '#cbd5e1' : '#94a3b8')
      .attr('font-size', d => d.isRootTopic ? '10px' : d.isCategory ? '9px' : '8px')
      .attr('font-weight', d => d.isRootTopic ? 'bold' : '500')
      .text(d => {
        if (d.isRootTopic) return d.label.length > 20 ? d.label.slice(0, 17) + '...' : d.label
        return d.label.length > 15 ? d.label.slice(0, 12) + '...' : d.label
      })

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      if (!d.isRootTopic) {
        d.fx = null
        d.fy = null
      }
    }

    const handleResize = () => {
      if (!svgRef.current) return
      const newWidth = svgRef.current.parentElement.clientWidth
      svg.attr('viewBox', `0 0 ${newWidth} ${height}`)
      assignTargetPositions(nodes, newWidth)
      simulation.force('center', d3.forceCenter(newWidth / 2, height / 2))
      simulation.force('x', d3.forceX(d => d.targetX).strength(d => d.isRootTopic ? 1.5 : d.isCategory ? 0.7 : 0.4))
      simulation.force('y', d3.forceY(d => d.targetY).strength(d => d.isRootTopic ? 1.5 : d.isCategory ? 0.7 : 0.4))
      simulation.alpha(0.3).restart()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [graph, userModel, topic])

  return <svg ref={svgRef} className="w-full h-full block"></svg>
}
