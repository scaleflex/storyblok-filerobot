import { FunctionComponent } from 'react'

const ModalToggle: FunctionComponent<{
  isModalOpen: boolean
  setModalOpen: (isModalOpen: boolean) => void
  refreshAssets: () => void,
  isLoading: boolean,
  totalAssets: number,
  showing: number,
  showMore: () => void,
}> = ({ isModalOpen, setModalOpen, refreshAssets, isLoading, totalAssets, showing, showMore }) => {
  return (
    <div>
      {totalAssets > 0 && (
          <div className="flex">
            <div className="column align-center">Total: {totalAssets}</div>
            {/* {showing < totalAssets && <div className="column align-center" onClick={() => showMore()}><span>Show More</span></div>}
            <div className="column align-right">Showing: {showing}</div> */}
          </div>
      )}
      
      <div className="flex">
        <button
          className="btn w-full column"
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
          className={`btn w-full column ${isLoading ? 'disabled' : ''}`}
          type="button"
          onClick={() => refreshAssets()}
          disabled={isLoading} // Disable button when isLoading is true
        >
          { isLoading ? 'loading...' : 'Refresh Assets'}
        </button>
      </div>
    </div>
  )
}

export default ModalToggle
