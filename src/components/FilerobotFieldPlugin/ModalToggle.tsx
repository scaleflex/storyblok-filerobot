import { FunctionComponent } from 'react'
import parse from 'html-react-parser'

const ModalToggle: FunctionComponent<{
  isModalOpen: boolean
  setModalOpen: (isModalOpen: boolean) => void
  refreshAssets: () => void,
  isLoading: boolean,
  totalAssets: number,
  countTypeAssets: () => any
}> = ({ isModalOpen, setModalOpen, refreshAssets, isLoading, totalAssets, countTypeAssets }) => {
  
  const typeAssets = {
    'image': 'Image',
    'video_and_audio': 'Video And Audio',
    'document': 'Document'
  };

  return ( 
    <div className="flex flex-justify-content-end">
      <button
        className="btn"
        type="button"
        onClick={() => setModalOpen(!isModalOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
            className="btn-add-svg">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        Add Assets
      </button>

      <button
        className={`btn bg-green ${isLoading || totalAssets == 0 ? 'disabled' : ''}`}
        type="button"
        onClick={() => refreshAssets()}
        disabled={isLoading || totalAssets == 0} // Disable button when isLoading is true
      >
        <svg className="btn-add-svg" xmlns="http://www.w3.org/2000/svg" fill="#fff" width="24" height="24" viewBox="0 0 24 24"><path d="M20.944 12.979c-.489 4.509-4.306 8.021-8.944 8.021-2.698 0-5.112-1.194-6.763-3.075l1.245-1.633c1.283 1.645 3.276 2.708 5.518 2.708 3.526 0 6.444-2.624 6.923-6.021h-2.923l4-5.25 4 5.25h-3.056zm-15.864-1.979c.487-3.387 3.4-6 6.92-6 2.237 0 4.228 1.059 5.51 2.698l1.244-1.632c-1.65-1.876-4.061-3.066-6.754-3.066-4.632 0-8.443 3.501-8.941 8h-3.059l4 5.25 4-5.25h-2.92z"/></svg>
        { isLoading ? 'loading...' : 'Refresh Assets'}
      </button>
    </div>
  )
}

export default ModalToggle
