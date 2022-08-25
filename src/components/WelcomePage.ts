import "@/assets/css/WelcomePage.less";
import { SVG_github, SVG_homepage } from "@/components/Icon";

export const WelcomePage=`
<div class="welcome-page">
  <article>Welcome To Web HexEditor!</article>
  <footer><a href="https://github.com/vowzero/hexeditor" target="_blank">${SVG_github}</a> | <a href="https://www.vowzero.xyz" rel="author" target="_blank">${SVG_homepage}</a></footer>
</div>
`;