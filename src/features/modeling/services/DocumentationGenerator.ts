import { Slice, Node, ElementType } from '../domain/types';
import { GraphCanvasKonvaRef } from '../../canvas/ui/GraphCanvas';

interface GeneratorConfig {
    projectTitle: string;
    description?: string;
}

export class DocumentationGenerator {
    private canvasRef: GraphCanvasKonvaRef;
    private slices: Slice[];
    private nodes: Node[];
    private definitions: any[];
    private setHiddenSliceIds: (ids: string[]) => void;

    constructor(
        canvasRef: GraphCanvasKonvaRef,
        slices: Slice[],
        nodes: Node[],
        definitions: any[] = [],
        setHiddenSliceIds: (ids: string[]) => void
    ) {
        this.canvasRef = canvasRef;
        this.slices = slices;
        this.nodes = nodes;
        this.definitions = definitions;
        this.setHiddenSliceIds = setHiddenSliceIds;
    }

    private async wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getSliceNodes(sliceId: string) {
        return this.nodes.filter(n => n.sliceId === sliceId);
    }

    private generateSliceMetadata(slice: Slice): string {
        const parts: string[] = [];
        if (slice.context) parts.push(`<span><strong>Context:</strong> ${slice.context}</span>`);
        if (slice.status) parts.push(`<span><strong>Status:</strong> ${slice.status}</span>`);
        if (slice.actors && slice.actors.length > 0) parts.push(`<span><strong>Actors:</strong> ${slice.actors.join(', ')}</span>`);

        if (parts.length === 0) return '';
        return `<div class="slice-metadata">${parts.join('')}</div>`;
    }

    private generateFieldTable(fields?: any[]): string {
        if (!fields || fields.length === 0) return '';

        let html = '<table class="field-table"><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>';
        fields.forEach(f => {
            const typeDisplay = f.schema ? `<a href="#def-${f.schema}">${f.type}${f.subfields ? '[]' : ''}</a>` : `${f.type}${f.subfields ? '[]' : ''}`;
            html += `<tr>
                <td>${f.name}</td>
                <td>${typeDisplay}</td>
                <td>${f.required ? 'Yes' : 'No'}</td>
                <td>${f.description || '-'}</td>
             </tr>`;
            if (f.subfields) {
                // Simple nested representation
                f.subfields.forEach((sf: any) => {
                    const sfTypeDisplay = sf.schema ? `<a href="#def-${sf.schema}">${sf.type}</a>` : sf.type;
                    html += `<tr>
                        <td style="padding-left: 20px;">↳ ${sf.name}</td>
                        <td>${sfTypeDisplay}</td>
                        <td>${sf.required ? 'Yes' : 'No'}</td>
                        <td>${sf.description || '-'}</td>
                     </tr>`;
                });
            }
        });
        html += '</tbody></table>';
        return html;
    }

    private renderService(node: Node): string {
        if (node.context === 'EXTERNAL') {
            return node.service ? `<span><strong>External Provider:</strong> ${node.service}</span>` : '';
        }
        return node.service ? `<span><strong>Owning Microservice:</strong> ${node.service}</span>` : '';
    }

    private generateTechnicalReference(slice: Slice): string {
        const sliceNodes = this.getSliceNodes(slice.id);
        const commands = sliceNodes.filter(n => n.type === ElementType.Command);
        const events = sliceNodes.filter(n => n.type === ElementType.DomainEvent || n.type === ElementType.IntegrationEvent);
        const readModels = sliceNodes.filter(n => n.type === ElementType.ReadModel);
        const screens = sliceNodes.filter(n => n.type === ElementType.Screen);
        const automations = sliceNodes.filter(n => n.type === ElementType.Automation);

        if (commands.length === 0 && events.length === 0 && readModels.length === 0 && screens.length === 0 && automations.length === 0) return '';

        let html = '<div class="tech-ref-section"><h2>Technical Reference</h2>';

        if (screens.length > 0) {
            html += '<h3>Screens</h3>';
            screens.forEach(scr => {
                html += `<div class="tech-item">
                    <h4>${scr.name}</h4>
                    ${scr.description ? `<p class="desc">${scr.description}</p>` : ''}
                    <div class="tech-meta">
                        ${this.renderService(scr)}
                    </div>
                </div>`;
            });
        }

        if (commands.length > 0) {
            html += '<h3>Commands</h3>';
            commands.forEach(cmd => {
                html += `<div class="tech-item">
                    <h4>${cmd.name}</h4>
                    ${cmd.description ? `<p class="desc">${cmd.description}</p>` : ''}
                    <div class="tech-meta">
                        ${cmd.apiEndpoint ? `<span><strong>Endpoint:</strong> ${cmd.apiEndpoint}</span>` : ''}
                        ${this.renderService(cmd)}
                        ${cmd.aggregate ? `<span><strong>Aggregate:</strong> ${cmd.aggregate}</span>` : ''}
                    </div>
                    ${this.generateFieldTable(cmd.fields)}
                 </div>`;
            });
        }

        if (events.length > 0) {
            html += '<h3>Events</h3>';
            events.forEach(evt => {
                html += `<div class="tech-item">
                    <h4>${evt.name}</h4>
                    ${evt.description ? `<p class="desc">${evt.description}</p>` : ''}
                    <div class="tech-meta">
                        ${this.renderService(evt)}
                        ${evt.domain ? `<span><strong>Domain:</strong> ${evt.domain}</span>` : ''}
                    </div>
                ${this.generateFieldTable(evt.fields)}
                </div>`;
            });
        }

        if (readModels.length > 0) {
            html += '<h3>Read Models</h3>';
            readModels.forEach(rm => {
                html += `<div class="tech-item">
                    <h4>${rm.name}</h4>
                    ${rm.description ? `<p class="desc">${rm.description}</p>` : ''}
                    <div class="tech-meta">
                        ${this.renderService(rm)}
                    </div>
                ${this.generateFieldTable(rm.fields)}
                </div>`;
            });
        }

        if (automations.length > 0) {
            html += '<h3>Automations</h3>';
            automations.forEach(auto => {
                html += `<div class="tech-item">
                    <h4>${auto.name}</h4>
                    ${auto.description ? `<p class="desc">${auto.description}</p>` : ''}
                    <div class="tech-meta">
                        ${this.renderService(auto)}
                    </div>
                </div>`;
            });
        }

        html += '</div>';
        return html;
    }

    private generateGWT(slice: Slice): string {
        // Option 1: Explicit Specifications (Preferred)
        if (slice.specifications && slice.specifications.length > 0) {
            let html = '<div class="gwt-section">';
            html += '<h2>Specification</h2>';

            slice.specifications.forEach(spec => {
                html += `<div class="scenario-block">`;
                html += `<span class="scenario-title">Scenario: ${spec.title}</span>`;

                if (spec.comments && spec.comments.length > 0) {
                    spec.comments.forEach(c => {
                        html += `<p class="desc"><em>${c.description}</em></p>`;
                    });
                }

                spec.given.forEach(step => {
                    html += `<div class="step-row"><span class="step-keyword">Given</span> ${step.title}</div>`;
                });
                spec.when.forEach(step => {
                    html += `<div class="step-row"><span class="step-keyword">When</span> ${step.title}</div>`;
                });
                spec.then.forEach(step => {
                    html += `<div class="step-row"><span class="step-keyword">Then</span> ${step.title}</div>`;
                });

                html += `</div>`;
            });

            html += '</div>';
            return html;
        }

        // Option 2: No Specification
        return `
            <div class="gwt-section">
                <h2>Specification</h2>
                <p>No specification defined.</p>
            </div>
        `;
    }

    public async generate(config: GeneratorConfig, onProgress?: (current: number, total: number, message: string) => void): Promise<string> {
        const sortedSlices = [...this.slices].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const total = sortedSlices.length;

        // 0. Backup current visibility state is assumed to be "all visible" or we should ideally read it?
        // For now, we assume we restore to "show all" (empty array) at the end.

        let htmlBody = '';
        let toc = '<ul>';

        // 1. Generate Metadata Section
        htmlBody += `
            <div class="project-header">
                <h1>${config.projectTitle}</h1>
                <p>Documentation generated on ${new Date().toLocaleDateString()}</p>
                <p>${config.description || ''}</p>
            </div>
            <div class="data-dictionary">
                <h2>Data Dictionary</h2>
                ${this.generateDictionaryHTML()}
            </div>
        `;

        // 2. Iterate Slices
        htmlBody += '<h1 style="margin-top: 4rem; margin-bottom: 2rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem;">Slices</h1>';
        for (let i = 0; i < total; i++) {
            const slice = sortedSlices[i];
            const progressMsg = `Processing Slice ${i + 1}/${total}: ${slice.title}`;
            onProgress?.(i + 1, total, progressMsg);

            // Isolate Slice
            const otherSliceIds = this.slices
                .filter(s => s.id !== slice.id)
                .map(s => s.id);

            this.setHiddenSliceIds(otherSliceIds);

            // Add to TOC
            toc += `<li><a href="#slice-${slice.id}">${slice.title}</a></li>`;

            // Capture
            this.canvasRef.panToSlice(slice.id);
            await this.wait(800); // 800ms for animation + rendering (virtualization)

            const dataUrl = this.canvasRef.getStageDataURL({ pixelRatio: 2, sliceId: slice.id }); // High-DPI & Smart Crop

            // Build Section
            htmlBody += `
                <section id="slice-${slice.id}" class="slice-section">
                <div class="slice-header">
                        <div class="slice-title-row">
                            <h2>${i + 1}. ${slice.title}</h2>
                            <a href="#top">Back to Top</a>
                        </div>
                        ${this.generateSliceMetadata(slice)}
                    </div>
                    <div class="slice-image">
                        <img src="${dataUrl}" alt="${slice.title}" />
                    </div>
                    <div class="slice-details">
                        ${this.generateTechnicalReference(slice)}
                        ${this.generateGWT(slice)}
                    </div>
                </section>
                <hr/>
            `;
        }

        // Restore Visibility
        this.setHiddenSliceIds([]);

        toc += '</ul>';

        // 3. Assemble Final HTML
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.projectTitle} - Event Model</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --bg-page: #f8fafc;
            --bg-card: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --accent-bg: #eff6ff;
            --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            line-height: 1.6; 
            color: var(--text-main); 
            background: var(--bg-page);
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 2rem; 
        }

        /* Typography */
        h1, h2, h3, h4 { color: var(--text-main); font-weight: 700; letter-spacing: -0.025em; }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.5rem; margin-top: 0; }
        h3 { font-size: 1.1rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; margin-top: 1.5rem; }
        a { color: var(--primary); text-decoration: none; transition: color 0.15s; }
        a:hover { color: var(--primary-hover); text-decoration: underline; }

        /* Project Header */
        .project-header { 
            text-align: center; 
            margin-bottom: 4rem; 
            padding: 3rem;
            background: linear-gradient(to bottom right, #ffffff, #f1f5f9);
            border-radius: 16px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--border-color);
        }
        .project-header p { color: var(--text-muted); font-size: 1.1rem; max-width: 600px; margin: 0.5rem auto 0; }

        /* Layout */
        .slice-section { 
            background: var(--bg-card);
            border-radius: 12px;
            box-shadow: var(--shadow-md);
            padding: 2.5rem;
            margin-bottom: 4rem;
            border: 1px solid var(--border-color);
            page-break-inside: avoid;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .slice-section:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }

        .slice-header { 
            border-bottom: 1px solid var(--border-color); 
            padding-bottom: 1rem; 
            margin-bottom: 2rem; 
        }
        .slice-title-row { display: flex; justify-content: space-between; align-items: baseline; }
        .slice-title-row h2 { font-size: 1.8rem; margin: 0; color: #1e293b; }
        .slice-title-row a { font-size: 0.875rem; font-weight: 500; }
        .slice-metadata { 
            margin-top: 0.75rem; 
            display: inline-flex; 
            gap: 1rem; 
            padding: 0.5rem 1rem; 
            background: var(--bg-page); 
            border-radius: 99px; 
            font-size: 0.875rem; 
            color: var(--text-muted); 
            border: 1px solid var(--border-color);
        }

        /* Image */
        .slice-image { 
            margin: 2rem auto 3rem; 
            border-radius: 8px; 
            overflow: hidden; 
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            width: 100%;
            aspect-ratio: 16/9; /* Enforce consistent ratio */
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .slice-image img { 
            max-width: 100%; 
            max-height: 100%; 
            object-fit: contain; 
            display: block; 
        }

        /* Content Areas */
        .slice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
        @media (max-width: 1024px) { .slice-details { grid-template-columns: 1fr; } }

        .tech-ref-section, .gwt-section {
            background: var(--bg-page);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            height: 100%;
            box-sizing: border-box; /* Ensure padding doesn't overflow width */
        }

        .tech-item { 
            background: white; 
            padding: 1rem; 
            border-radius: 6px; 
            border: 1px solid var(--border-color);
            margin-bottom: 1rem;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            page-break-inside: avoid; /* Prevent breaking inside an item */
        }
        .tech-item h4 { margin: 0 0 0.25rem 0; font-size: 1rem; }
        .tech-item .desc { font-size: 0.875rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 0.5rem; }
        .tech-meta { font-size: 0.75rem; color: #94a3b8; display: flex; gap: 1rem; flex-wrap: wrap; text-transform: uppercase; font-weight: 600; }

        /* Tables (Data Dictionary & Fields) */
        table { width: 100%; border-collapse: separate; border-spacing: 0; width: 100%; margin-top: 1rem; font-size: 0.9rem; page-break-inside: avoid; }
        th { 
            background: #f1f5f9; 
            font-weight: 600; 
            text-align: left; 
            padding: 0.75rem 1rem; 
            color: var(--text-muted);
            font-size: 0.75rem; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border-color);
        }
        td { 
            padding: 0.75rem 1rem; 
            border-bottom: 1px solid var(--border-color); 
            color: var(--text-main);
            vertical-align: top;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8fafc; }
        
        .field-table { margin-top: 0.5rem; border: none; }
        .field-table td { padding: 0.5rem 0; border: none; font-size: 0.85rem; border-top: 1px dashed var(--border-color); }
        .field-table tr:first-child td { border-top: none; }
        .field-table th { display: none; }

        /* Specification */
        .scenario-block { 
            margin-bottom: 1.5rem; 
            background: white; 
            padding: 1rem; 
            border-radius: 6px; 
            border-left: 3px solid var(--primary); 
            box-shadow: var(--shadow-sm);
            page-break-inside: avoid;
        }
        .scenario-title { display: block; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem; }
        .step-row { 
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace; 
            font-size: 0.85rem; 
            color: #334155; 
            margin-bottom: 0.25rem; 
        }
        .step-keyword { color: var(--primary); font-weight: 700; margin-right: 0.5rem; }

        /* Print Override */
        @media print {
            @page {
                size: A4;
                margin: 15mm;
            }
            body { background: white; padding: 0; max-width: none; }
            .project-header { background: none; border: none; box-shadow: none; margin-bottom: 2rem; padding: 0; }
            .project-header h1 { font-size: 2rem; color: black; }
            
            .slice-section { 
                box-shadow: none; 
                border: none;
                border-bottom: 1px solid #ddd;
                padding: 0;
                padding-bottom: 2rem;
                margin-bottom: 2rem; 
                background: white;
                /* Allow breaking inside to prevent huge gaps */
                display: block; 
            }
            
            .slice-header {
                break-after: avoid; /* Keep header with content */
                page-break-after: avoid;
            }

            .slice-image {
                 border: 1px solid #eee;
                 box-shadow: none;
                 background: white;
                 break-inside: avoid; /* Don't cut image in half */
                 page-break-inside: avoid;
            }
            
            .tech-item, .scenario-block, table, .slice-metadata {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            /* Hide web-only controls */
            a[href="#top"] { display: none; }
            
            /* Ensure text is black/dark for printing */
            h1, h2, h3, h4, p, span, div { color: #000 !important; }
            .slice-metadata { border: 1px solid #ccc; color: #333; }
        }
    </style>
</head>
<body id="top">
    ${htmlBody}
</body>
</html>
        `;
    }

    private generateDictionaryHTML(): string {
        if (this.definitions.length === 0) return '<p>No data definitions.</p>';

        let html = '<table><thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>';

        this.definitions.forEach(def => {
            html += `<tr id="def-${def.name}">
                <td><strong>${def.name}</strong></td>
                <td>${def.type}</td>
                <td>${def.description || '-'}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        return html;
    }
}
