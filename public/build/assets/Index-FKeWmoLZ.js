import{n as e,r as t,t as n}from"./jsx-runtime-DqsOdvoF.js";import{t as r}from"./AdminLayout-C8WhDs3u.js";import{u as i}from"./app-CNYEaLpm.js";import{t as a}from"./Card-DeMAC1KM.js";import{t as o}from"./PageHeader-CUJpBN9q.js";var s=n();function c({node:e}){return(0,s.jsxs)(`li`,{children:[(0,s.jsxs)(t,{href:route(`admin.users.edit`,e.id),className:`orgchart-node`,children:[(0,s.jsx)(`div`,{className:`mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-ink-100 bg-ink-50`,children:e.avatar?(0,s.jsx)(`img`,{src:`/storage/${e.avatar}`,alt:e.name,className:`h-full w-full object-cover`}):(0,s.jsx)(i,{className:`h-6 w-6 text-ink-300`})}),(0,s.jsx)(`p`,{className:`mt-2 text-sm font-semibold text-ink-900`,children:e.name}),e.position&&(0,s.jsx)(`p`,{className:`text-xs text-ink-500`,children:e.position}),e.department&&(0,s.jsx)(`span`,{className:`mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700`,children:e.department})]}),e.children.length>0&&(0,s.jsx)(`ul`,{children:e.children.map(e=>(0,s.jsx)(c,{node:e},e.id))})]})}function l({tree:n}){return(0,s.jsxs)(r,{children:[(0,s.jsx)(e,{title:`Organigramme`}),(0,s.jsx)(o,{title:`Organigramme`,subtitle:`Structure hiérarchique du personnel administratif, basée sur le supérieur hiérarchique de chacun.`}),(0,s.jsx)(a,{className:`p-6`,children:n.length===0?(0,s.jsx)(`p`,{className:`py-10 text-center text-ink-500`,children:`Aucun membre du personnel administratif pour le moment.`}):(0,s.jsx)(`div`,{className:`orgchart-tree overflow-x-auto pb-4`,children:(0,s.jsx)(`ul`,{children:n.map(e=>(0,s.jsx)(c,{node:e},e.id))})})}),(0,s.jsxs)(`p`,{className:`mt-4 text-xs text-ink-500`,children:[`Astuce : définissez le « Supérieur hiérarchique » de chaque membre depuis sa fiche`,` `,(0,s.jsx)(t,{href:route(`admin.users.index`),className:`text-brand-600 underline`,children:`Personnel administratif`}),` `,`pour construire l'organigramme.`]}),(0,s.jsx)(`style`,{children:`
                .orgchart-tree, .orgchart-tree ul {
                    padding-top: 20px;
                    position: relative;
                    transition: all 0.4s;
                }
                .orgchart-tree ul {
                    display: flex;
                    justify-content: center;
                }
                .orgchart-tree li {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    list-style-type: none;
                    position: relative;
                    padding: 20px 12px 0 12px;
                }
                .orgchart-tree li::before,
                .orgchart-tree li::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 50%;
                    border-top: 2px solid #e5ddd3;
                    width: 50%;
                    height: 20px;
                }
                .orgchart-tree li::after {
                    right: auto;
                    left: 50%;
                    border-left: 2px solid #e5ddd3;
                }
                .orgchart-tree li:only-child::after,
                .orgchart-tree li:only-child::before {
                    display: none;
                }
                .orgchart-tree li:only-child {
                    padding-top: 0;
                }
                .orgchart-tree li:first-child::before,
                .orgchart-tree li:last-child::after {
                    border: 0 none;
                }
                .orgchart-tree li:last-child::before {
                    border-right: 2px solid #e5ddd3;
                    border-radius: 0 5px 0 0;
                }
                .orgchart-tree li:first-child::after {
                    border-radius: 5px 0 0 0;
                }
                .orgchart-tree ul ul::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    border-left: 2px solid #e5ddd3;
                    width: 0;
                    height: 20px;
                }
                .orgchart-node {
                    display: inline-block;
                    min-width: 140px;
                    border: 1px solid #ece4d8;
                    border-radius: 0.5rem;
                    background: #fff;
                    padding: 12px 14px;
                    text-align: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                    transition: box-shadow 0.15s, border-color 0.15s;
                }
                .orgchart-node:hover {
                    border-color: #c9a15a;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                }
            `})]})}export{l as default};