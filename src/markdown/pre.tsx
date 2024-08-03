import { defineComponent } from 'vue';

export default defineComponent({
  name: 'pre',
  props: {},
  setup(props) {
    console.log("props");
    
    return () => {
      return (
        <div class={['messageInput']}>
          <br></br>
          <br></br>
          messageInput
          <br></br>
          <br></br>
          {/* todo */}
          {/* <div class={chatStyles['messageInput_tabs']}></div> */}
        </div>
      );
    };
  }
});
