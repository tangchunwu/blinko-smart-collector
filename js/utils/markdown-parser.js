/**
 * 轻量级Markdown解析器
 */
export const MarkdownParser = {
       // 解析Markdown为HTML
       parse(text) {
              if (!text) return '';

              let html = text;

              // 1. 保护数学公式（先提取出来）
              const mathBlocks = [];
              const mathInlines = [];

              // 保护块级公式 $$...$$
              html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
                     mathBlocks.push(content);
                     return `%%MATHBLOCK${mathBlocks.length - 1}%%`;
              });

              // 保护行内公式 $...$
              html = html.replace(/\$([^\$\n]+?)\$/g, (match, content) => {
                     mathInlines.push(content);
                     return `%%MATHINLINE${mathInlines.length - 1}%%`;
              });

              // 2. 转义HTML特殊字符（防XSS）
              html = this.escapeHtml(html);

              // 3. 提取并处理代码块
              const codeBlocks = [];
              html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                     codeBlocks.push({ lang, code: code.trim() });
                     return `%%CODEBLOCK${codeBlocks.length - 1}%%`;
              });

              // 4. 处理行内代码
              html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

              // 5. 处理标题
              html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
              html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
              html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

              // 6. 处理引用
              html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

              // 7. 处理分隔线
              html = html.replace(/^---$/gm, '<hr>');
              html = html.replace(/^\*\*\*$/gm, '<hr>');

              // 8. 处理无序列表
              html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
              html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

              // 9. 处理有序列表
              html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

              // 10. 处理粗体和斜体
              html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
              html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
              html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
              html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
              html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
              html = html.replace(/_(.+?)_/g, '<em>$1</em>');

              // 清理未配对的 ** 符号（在格式处理后仍然存在的）
              // 注意：只清理不在 HTML 标签内的 **
              html = html.replace(/\*\*/g, '');

              // 11. 处理链接
              html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

              // 12. 处理表格
              html = this.parseTable(html);

              // 13. 还原代码块
              codeBlocks.forEach((block, i) => {
                     const langClass = block.lang ? ` class="language-${block.lang}"` : '';
                     html = html.replace(`%%CODEBLOCK${i}%%`, `<pre><code${langClass}>${block.code}</code></pre>`);
              });

              // 14. 还原数学公式
              mathBlocks.forEach((content, i) => {
                     html = html.replace(`%%MATHBLOCK${i}%%`, `<div class="math-block">$$${content}$$</div>`);
              });
              mathInlines.forEach((content, i) => {
                     html = html.replace(`%%MATHINLINE${i}%%`, `<span class="math-inline">$${content}$</span>`);
              });

              // 15. 处理段落和换行
              // 先清理列表内的换行（列表项之间不需要额外换行）
              html = html.replace(/<\/li>\n+<li>/g, '</li><li>');
              html = html.replace(/<ul>\n+/g, '<ul>');
              html = html.replace(/\n+<\/ul>/g, '</ul>');

              // 处理段落分隔（两个或以上换行符 -> 新段落）
              html = html.replace(/\n\n+/g, '</p><p>');

              // 剩余的单个换行符转为 br，但不在块级元素边界处
              html = html.replace(/\n/g, '<br>');

              // 清理多余的空段落和块级元素周围的 p 标签
              html = html.replace(/<p><\/p>/g, '');
              html = html.replace(/<p>(<h[1-3]>)/g, '$1');
              html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
              html = html.replace(/<p>(<ul>)/g, '$1');
              html = html.replace(/(<\/ul>)<\/p>/g, '$1');
              html = html.replace(/<p>(<pre>)/g, '$1');
              html = html.replace(/(<\/pre>)<\/p>/g, '$1');
              html = html.replace(/<p>(<blockquote>)/g, '$1');
              html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
              html = html.replace(/<p>(<hr>)/g, '$1');
              html = html.replace(/(<hr>)<\/p>/g, '$1');
              html = html.replace(/<p>(<table>)/g, '$1');
              html = html.replace(/(<\/table>)<\/p>/g, '$1');

              // 清理列表周围的 br 标签
              html = html.replace(/<br><ul>/g, '<ul>');
              html = html.replace(/<\/ul><br>/g, '</ul>');
              html = html.replace(/<br><\/li>/g, '</li>');
              html = html.replace(/<li><br>/g, '<li>');

              return html;
       },

       // HTML转义
       escapeHtml(text) {
              const map = {
                     '&': '&amp;',
                     '<': '&lt;',
                     '>': '&gt;',
                     '"': '&quot;',
                     "'": '&#039;'
              };
              return text.replace(/[&<>"']/g, m => map[m]);
       },

       // 解析表格
       parseTable(html) {
              const lines = html.split('\n');
              let inTable = false;
              let tableHtml = '';
              let result = [];

              for (let i = 0; i < lines.length; i++) {
                     const line = lines[i].trim();

                     // 检测表格行（包含 | 分隔符）
                     if (line.startsWith('|') && line.endsWith('|')) {
                            if (!inTable) {
                                   inTable = true;
                                   tableHtml = '<table>';
                            }

                            // 跳过分隔行 |---|---|
                            if (/^\|[\s\-:|]+\|$/.test(line)) {
                                   continue;
                            }

                            const cells = line.slice(1, -1).split('|').map(c => c.trim());
                            const isHeader = i === 0 || (i > 0 && /^\|[\s\-:|]+\|$/.test(lines[i + 1]?.trim() || ''));
                            const tag = isHeader && !tableHtml.includes('<tbody>') ? 'th' : 'td';

                            if (tag === 'th') {
                                   tableHtml += '<thead><tr>';
                            } else if (!tableHtml.includes('<tbody>')) {
                                   tableHtml += '</thead><tbody><tr>';
                            } else {
                                   tableHtml += '<tr>';
                            }

                            cells.forEach(cell => {
                                   tableHtml += `<${tag}>${cell}</${tag}>`;
                            });
                            tableHtml += '</tr>';
                     } else {
                            if (inTable) {
                                   tableHtml += '</tbody></table>';
                                   result.push(tableHtml);
                                   tableHtml = '';
                                   inTable = false;
                            }
                            result.push(line);
                     }
              }

              if (inTable) {
                     tableHtml += '</tbody></table>';
                     result.push(tableHtml);
              }

              return result.join('\n');
       }
};
